const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

/**
 * Load settings from Firestore config document or fallback to environment variables
 */
async function getSettings() {
  try {
    const doc = await db.collection('settings').doc('config').get();
    const data = doc.exists ? doc.data() : {};

    return {
      enabled: data.enabled !== undefined ? data.enabled : true,
      mode: data.mode || 'ai', // 'ai', 'keyword', or 'any'
      keywordTrigger: data.keywordTrigger || 'link',
      customPrompt: data.customPrompt || 'Analyze if the commenter is asking for information, a link, a guide, or pricing. Respond with JSON.',
      dmTemplate: data.dmTemplate || 'Hey there! 👋 Thanks for commenting on my post! Here is the link you requested: https://example.com/info',
      replyCommentTemplate: data.replyCommentTemplate || 'Sent you a DM! Check your inbox 📥✨',
      metaAccessToken: data.metaAccessToken || process.env.META_PAGE_ACCESS_TOKEN || '',
      metaVerifyToken: data.metaVerifyToken || process.env.META_VERIFY_TOKEN || 'YOUR_SECURE_VERIFY_TOKEN',
      geminiApiKey: data.geminiApiKey || process.env.GEMINI_API_KEY || ''
    };
  } catch (err) {
    console.error('Error fetching settings from Firestore:', err);
    return {
      enabled: true,
      mode: 'ai',
      keywordTrigger: 'link',
      customPrompt: '',
      dmTemplate: 'Check your DM! 📥',
      replyCommentTemplate: 'Sent you a DM! Check your inbox 📥',
      metaAccessToken: process.env.META_PAGE_ACCESS_TOKEN || '',
      metaVerifyToken: process.env.META_VERIFY_TOKEN || 'YOUR_SECURE_VERIFY_TOKEN',
      geminiApiKey: process.env.GEMINI_API_KEY || ''
    };
  }
}

/**
 * Healthcheck route
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', engine: 'Render Standalone Node.js', timestamp: new Date().toISOString() });
});

/**
 * GET /api/media - Fetch user's uploaded Instagram Reels & Posts
 */
app.get('/api/media', async (req, res) => {
  try {
    const settings = await getSettings();
    const token = (req.query.token || req.headers['x-meta-token'] || settings.metaAccessToken || '').trim();

    if (!token || token === 'YOUR_META_PAGE_ACCESS_TOKEN') {
      return res.status(400).json({ 
        error: 'Meta Page Access Token is missing',
        details: 'Please enter your Meta Page Access Token in Settings and click Save Automation Rules.'
      });
    }

    // Get Instagram Business Account ID
    const meRes = await axios.get(`https://graph.facebook.com/v19.0/me`, {
      params: {
        fields: 'id,name,instagram_business_account',
        access_token: token
      }
    });

    let igAccountId = meRes.data.instagram_business_account ? meRes.data.instagram_business_account.id : null;

    if (!igAccountId) {
      const accountsRes = await axios.get(`https://graph.facebook.com/v19.0/me/accounts`, {
        params: {
          fields: 'id,name,instagram_business_account',
          access_token: token
        }
      });

      const pages = accountsRes.data.data || [];
      for (const page of pages) {
        if (page.instagram_business_account) {
          igAccountId = page.instagram_business_account.id;
          break;
        }
      }
    }

    if (!igAccountId) {
      return res.status(404).json({ 
        error: 'No Instagram Business / Creator Account linked to this token',
        details: 'Ensure your Instagram account is converted to Business/Creator and linked to your Facebook Page.'
      });
    }

    // Fetch Recent Posts / Reels
    const mediaRes = await axios.get(`https://graph.facebook.com/v19.0/${igAccountId}/media`, {
      params: {
        fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
        limit: 20,
        access_token: token
      }
    });

    return res.status(200).json({
      igAccountId,
      media: mediaRes.data.data || []
    });

  } catch (err) {
    const apiError = err.response && err.response.data && err.response.data.error 
      ? err.response.data.error.message 
      : (err.response ? JSON.stringify(err.response.data) : err.message);
    console.error('Error fetching Instagram media:', apiError);
    return res.status(500).json({
      error: 'Failed to fetch Instagram posts',
      details: apiError
    });
  }
});

/**
 * GET /webhook - Meta Webhook Verification Challenge
 */
app.get('/webhook', async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const settings = await getSettings();

  if (mode && token) {
    if (mode === 'subscribe' && token === settings.metaVerifyToken) {
      console.log('Meta Webhook Verified Successfully!');
      return res.status(200).send(challenge);
    } else {
      console.warn('Meta Webhook Verification Failed. Token mismatch.');
      return res.sendStatus(403);
    }
  }
  return res.status(400).send('Missing hub.mode or hub.verify_token');
});

/**
 * POST /webhook - Meta Webhook Event Receiver
 */
app.post('/webhook', async (req, res) => {
  const body = req.body;

  // Acknowledge Meta immediately to avoid timeouts (5-second rule)
  res.status(200).send('EVENT_RECEIVED');

  if (body.object === 'instagram' || body.object === 'page') {
    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field === 'comments') {
          const value = change.value;
          if (value && value.id) {
            processCommentEvent(value).catch(err => {
              console.error('Error processing comment event:', err);
            });
          }
        }
      }
    }
  }
});

/**
 * Asynchronously process an incoming Instagram comment
 */
async function processCommentEvent(value) {
  const commentId = value.id;
  const commentText = value.text || '';
  const fromUser = value.from || {};
  const userId = fromUser.id || '';
  const username = fromUser.username || 'User';
  const mediaId = (value.media && value.media.id) || value.media_id || '';

  console.log(`Processing comment [${commentId}] from @${username}: "${commentText}"`);

  // Deduplication check in Firestore
  const logRef = db.collection('logs').doc(commentId);
  const doc = await logRef.get();
  if (doc.exists) {
    console.log(`Comment [${commentId}] has already been processed. Skipping.`);
    return;
  }

  let settings = await getSettings();

  // Check post-specific rules
  let activeRule = {
    mode: settings.mode,
    keywordTrigger: settings.keywordTrigger,
    customPrompt: settings.customPrompt,
    dmTemplate: settings.dmTemplate,
    replyCommentTemplate: settings.replyCommentTemplate,
    isPostSpecific: false
  };

  if (mediaId) {
    try {
      const postRuleDoc = await db.collection('post_rules').doc(mediaId).get();
      if (postRuleDoc.exists && postRuleDoc.data().enabled !== false) {
        const postData = postRuleDoc.data();
        activeRule = {
          mode: postData.mode || settings.mode,
          keywordTrigger: postData.keywordTrigger !== undefined ? postData.keywordTrigger : settings.keywordTrigger,
          customPrompt: postData.customPrompt !== undefined ? postData.customPrompt : settings.customPrompt,
          dmTemplate: postData.dmTemplate !== undefined ? postData.dmTemplate : settings.dmTemplate,
          replyCommentTemplate: postData.replyCommentTemplate !== undefined ? postData.replyCommentTemplate : settings.replyCommentTemplate,
          isPostSpecific: true
        };
        console.log(`Using Post-Specific Rule for Reel/Post [${mediaId}]`);
      }
    } catch (ruleErr) {
      console.warn('Error checking post_rules:', ruleErr);
    }
  }

  // Create initial pending log
  const initialLog = {
    commentId,
    username,
    userId,
    commentText,
    mediaId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    status: 'processing',
    modeUsed: activeRule.mode,
    isPostSpecific: activeRule.isPostSpecific,
    aiReasoning: null,
    dmSent: false,
    commentReplied: false,
    error: null
  };
  await logRef.set(initialLog);

  if (!settings.enabled) {
    console.log('Automation is currently PAUSED in settings. Skipping action.');
    await logRef.update({ status: 'skipped_automation_disabled' });
    return;
  }

  let shouldSendDM = false;
  let aiReasoning = '';

  // 1. Evaluate Trigger Logic
  if (activeRule.mode === 'any') {
    shouldSendDM = true;
    aiReasoning = 'ANY Comment Mode active — triggered on all comments';
  } else if (activeRule.mode === 'keyword') {
    const rawTrigger = activeRule.keywordTrigger || 'link';
    const triggers = rawTrigger.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    const commentLower = commentText.toLowerCase();
    
    const matchedTrigger = triggers.find(t => commentLower.includes(t));
    shouldSendDM = Boolean(matchedTrigger);
    aiReasoning = shouldSendDM 
      ? `Matched keyword/emoji trigger: "${matchedTrigger}"` 
      : `Did not contain any trigger from: "${rawTrigger}"`;
  } else {
    // AI Mode using Gemini API
    if (!settings.geminiApiKey) {
      console.warn('Gemini API key is missing. Falling back to simple link trigger check.');
      shouldSendDM = commentText.toLowerCase().includes('link') || commentText.toLowerCase().includes('dm') || commentText.toLowerCase().includes('info');
      aiReasoning = 'Fallback keyword check (Gemini API key missing)';
    } else {
      try {
        const genAI = new GoogleGenerativeAI(settings.geminiApiKey.trim());
        const model = genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          generationConfig: { responseMimeType: 'application/json' }
        });

        const prompt = `You are an AI assistant evaluating an Instagram comment on a post/reel.
Task: Determine if the commenter is requesting a link, information, details, a guide, or expressing strong interest in the post content.

Comment: "${commentText}"

User custom rule: "${activeRule.customPrompt || 'Evaluate intent for info/link'}"

Respond ONLY with a valid JSON object in this format:
{
  "shouldSend": true or false,
  "reasoning": "brief 1-sentence explanation"
}`;

        const result = await model.generateContent(prompt);
        let textResponse = result.response.text().trim();
        // Clean markdown code blocks if returned
        textResponse = textResponse.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();

        const parsed = JSON.parse(textResponse);
        shouldSendDM = Boolean(parsed.shouldSend);
        aiReasoning = parsed.reasoning || 'Evaluated by Gemini AI';
      } catch (aiErr) {
        console.error('Gemini API Error:', aiErr);
        shouldSendDM = commentText.toLowerCase().includes('link') || commentText.toLowerCase().includes('info');
        aiReasoning = `Gemini API Error (${aiErr.message}). Fallback trigger evaluated.`;
      }
    }
  }

  // 2. Perform Instagram Actions if triggered
  if (!shouldSendDM) {
    console.log(`Comment [${commentId}] did not trigger DM. Reason: ${aiReasoning}`);
    await logRef.update({
      status: 'ignored',
      aiReasoning
    });
    return;
  }

  let dmSent = false;
  let commentReplied = false;
  let executionError = null;

  if (!settings.metaAccessToken) {
    executionError = 'Meta Page Access Token is missing in settings!';
    console.error(executionError);
  } else {
    // Send Instagram Direct Message
    try {
      const dmUrl = `https://graph.facebook.com/v19.0/${commentId}/messages`;
      const dmPayload = {
        recipient: { comment_id: commentId },
        message: { text: activeRule.dmTemplate }
      };

      await axios.post(dmUrl, dmPayload, {
        params: { access_token: settings.metaAccessToken }
      });
      dmSent = true;
      console.log(`Successfully sent DM to comment [${commentId}]`);
    } catch (dmErr) {
      console.error('Failed to send Instagram DM via Graph API:', dmErr.response ? dmErr.response.data : dmErr.message);
      executionError = `DM Error: ${dmErr.response ? JSON.stringify(dmErr.response.data) : dmErr.message}`;
    }

    // Reply to Instagram Comment
    if (activeRule.replyCommentTemplate && activeRule.replyCommentTemplate.trim() !== '') {
      try {
        const replyUrl = `https://graph.facebook.com/v19.0/${commentId}/replies`;
        await axios.post(replyUrl, {
          message: activeRule.replyCommentTemplate
        }, {
          params: { access_token: settings.metaAccessToken }
        });
        commentReplied = true;
        console.log(`Successfully replied to comment [${commentId}]`);
      } catch (replyErr) {
        console.error('Failed to reply to Instagram comment:', replyErr.response ? replyErr.response.data : replyErr.message);
        if (!executionError) {
          executionError = `Comment Reply Error: ${replyErr.response ? JSON.stringify(replyErr.response.data) : replyErr.message}`;
        }
      }
    }
  }

  // Update Firestore Log
  await logRef.update({
    status: dmSent ? 'success' : (executionError ? 'failed' : 'ignored'),
    aiReasoning,
    dmSent,
    commentReplied,
    error: executionError
  });
}

// Start Standalone HTTP Server on Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 InstaAI Automation Webhook Server running on port ${PORT}`);
});
