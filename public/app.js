// Main Frontend JavaScript - InstaAI Automation Dashboard

document.addEventListener('DOMContentLoaded', () => {
  let db = null;

  // Check if Firebase is initialized
  try {
    if (firebase.apps.length) {
      db = firebase.firestore();
      console.log('Firebase Firestore Connected Successfully');
    }
  } catch (e) {
    console.warn('Firebase initialization error. Check firebase-config.js:', e);
  }

  // DOM Elements
  const statusPill = document.getElementById('status-pill');
  const statusText = document.getElementById('status-text');
  const masterToggle = document.getElementById('master-toggle');

  const configForm = document.getElementById('config-form');
  const modeAiRadio = document.getElementById('mode-ai');
  const modeKeywordRadio = document.getElementById('mode-keyword');
  const keywordGroup = document.getElementById('keyword-group');
  const keywordInput = document.getElementById('keyword-input');
  const customPromptInput = document.getElementById('custom-prompt');
  const dmTemplateInput = document.getElementById('dm-template');
  const replyTemplateInput = document.getElementById('reply-template');
  const backendUrlInput = document.getElementById('backend-url');
  const metaTokenInput = document.getElementById('meta-token');
  const metaVerifyInput = document.getElementById('meta-verify');
  const geminiKeyInput = document.getElementById('gemini-key');
  const saveToast = document.getElementById('save-toast');

  const metricTotal = document.getElementById('metric-total');
  const metricDms = document.getElementById('metric-dms');
  const metricMatch = document.getElementById('metric-match');
  const metricErrors = document.getElementById('metric-errors');
  const modeAnyRadio = document.getElementById('mode-any');
  const aiPromptGroup = document.getElementById('ai-prompt-group');

  const fetchMediaBtn = document.getElementById('fetch-media-btn');
  const mediaGrid = document.getElementById('media-grid');
  const activeTargetBadge = document.getElementById('active-target-badge');
  const testCommentBtn = document.getElementById('test-comment-btn');
  const activityFeed = document.getElementById('activity-feed');

  let currentTargetMediaId = 'GLOBAL'; // Default to Global Target
  let currentTargetMediaTitle = 'All Posts (Global)';

  function setActiveTarget(mediaId, title) {
    currentTargetMediaId = mediaId;
    currentTargetMediaTitle = title;

    activeTargetBadge.innerHTML = mediaId === 'GLOBAL' 
      ? `<i class="fa-solid fa-globe"></i> Active Target: <strong>All Posts (Global)</strong>`
      : `<i class="fa-brands fa-instagram"></i> Active Target: <strong>Post ID ${mediaId}</strong>`;

    // Highlight selected card
    document.querySelectorAll('.media-card').forEach(card => {
      if (card.getAttribute('data-media-id') === mediaId) {
        card.classList.add('active-target');
      } else {
        card.classList.remove('active-target');
      }
    });

    // Load settings for selected target from Firestore
    loadTargetSettings(mediaId);
  }

  // Load Settings from Firestore for given target
  function loadTargetSettings(mediaId) {
    const docRef = mediaId === 'GLOBAL' 
      ? db.collection('settings').doc('config')
      : db.collection('post_rules').doc(mediaId);

    docRef.get().then((doc) => {
      if (doc.exists) {
        const data = doc.data();

        if (data.mode === 'keyword') {
          modeKeywordRadio.checked = true;
        } else if (data.mode === 'any') {
          modeAnyRadio.checked = true;
        } else {
          modeAiRadio.checked = true;
        }
        updateModeVisibility();

        if (data.keywordTrigger !== undefined) keywordInput.value = data.keywordTrigger;
        if (data.customPrompt !== undefined) customPromptInput.value = data.customPrompt;
        if (data.dmTemplate !== undefined) dmTemplateInput.value = data.dmTemplate;
        if (data.replyCommentTemplate !== undefined) replyTemplateInput.value = data.replyCommentTemplate;
      }
    }).catch(err => {
      console.warn('Error loading target settings:', err);
    });
  }

  // Click handler on Global Card
  document.getElementById('global-target-card').addEventListener('click', () => {
    setActiveTarget('GLOBAL', 'All Posts (Global)');
  });

  // Fetch Posts & Reels from Instagram via API
  fetchMediaBtn.addEventListener('click', () => {
    fetchMediaBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Fetching...`;

    const token = metaTokenInput ? metaTokenInput.value.trim() : '';
    let baseUrl = (backendUrlInput && backendUrlInput.value.trim() !== '')
      ? backendUrlInput.value.trim().replace(/\/$/, '')
      : 'https://nothingdm.onrender.com';

    let targetApiUrl = `${baseUrl}/api/media`;
    if (token) {
      targetApiUrl += `?token=${encodeURIComponent(token)}`;
    }

    fetch(targetApiUrl)
      .then(res => res.json())
      .then(data => {
        fetchMediaBtn.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> Fetch My Reels & Posts`;

        if (data.error) {
          const detailStr = data.details ? `\n\nDetails: ${typeof data.details === 'object' ? JSON.stringify(data.details) : data.details}` : '';
          alert(`Unable to fetch Instagram posts: ${data.error}${detailStr}\n\nTip: Paste your Meta Access Token into the Settings form and click Save Automation Rules!`);
          return;
        }

        const mediaItems = data.media || [];
        if (mediaItems.length === 0) {
          alert('No posts or reels found. Ensure your Instagram Business account has public posts.');
        }
        renderMediaCards(mediaItems);
      })
      .catch(err => {
        fetchMediaBtn.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> Fetch My Reels & Posts`;
        console.warn('API Error, rendering demo post cards:', err);
        alert('Could not reach backend API server. Check your internet connection or backend server URL.');
        renderMediaCards([
          { id: '1798543210001', caption: '🔥 New AI Masterclass! Comment "PDF" to get the link!', media_type: 'VIDEO', permalink: '#' },
          { id: '1798543210002', caption: '✨ Top 5 Automation Tools in 2026. Comment "TOOLS"', media_type: 'IMAGE', permalink: '#' },
          { id: '1798543210003', caption: '🚀 How I automated my DMs. Drop any comment below!', media_type: 'VIDEO', permalink: '#' }
        ]);
      });
  });

  function renderMediaCards(mediaItems) {
    mediaGrid.innerHTML = `
      <div class="media-card ${currentTargetMediaId === 'GLOBAL' ? 'active-target' : ''}" id="global-target-card" data-media-id="GLOBAL">
        <div class="media-thumb-placeholder">
          <i class="fa-solid fa-globe"></i>
        </div>
        <div class="media-info">
          <span class="media-title">Global Target (Default)</span>
          <small>Apply rules to all incoming comments across all posts</small>
        </div>
      </div>
    `;

    document.getElementById('global-target-card').addEventListener('click', () => {
      setActiveTarget('GLOBAL', 'All Posts (Global)');
    });

    mediaItems.forEach(item => {
      const card = document.createElement('div');
      card.className = `media-card ${currentTargetMediaId === item.id ? 'active-target' : ''}`;
      card.setAttribute('data-media-id', item.id);

      const isVideo = item.media_type === 'VIDEO' || item.media_type === 'REELS';
      const iconClass = isVideo ? 'fa-video' : 'fa-image';

      card.innerHTML = `
        <div class="media-thumb-placeholder">
          <i class="fa-solid ${iconClass}"></i>
        </div>
        <div class="media-info">
          <span class="media-title">${item.media_type || 'POST'} #${item.id.slice(-4)}</span>
          <small>${item.caption || 'No caption'}</small>
        </div>
      `;

      card.addEventListener('click', () => {
        setActiveTarget(item.id, `Post #${item.id.slice(-4)}`);
      });

      mediaGrid.appendChild(card);
    });
  }

  // Mode Radio Toggle Handler
  function updateModeVisibility() {
    if (modeKeywordRadio.checked) {
      keywordGroup.style.display = 'flex';
      aiPromptGroup.style.display = 'none';
    } else if (modeAiRadio.checked) {
      keywordGroup.style.display = 'none';
      aiPromptGroup.style.display = 'flex';
    } else if (modeAnyRadio.checked) {
      keywordGroup.style.display = 'none';
      aiPromptGroup.style.display = 'none';
    }
  }

  modeAiRadio.addEventListener('change', updateModeVisibility);
  modeKeywordRadio.addEventListener('change', updateModeVisibility);
  modeAnyRadio.addEventListener('change', updateModeVisibility);

  // Background Health Check Ping to Render server to wake it up from sleep
  const defaultBackendUrl = 'https://nothingdm.onrender.com';
  if (backendUrlInput && !backendUrlInput.value.trim()) {
    backendUrlInput.value = defaultBackendUrl;
  }

  fetch(`${defaultBackendUrl}/health`)
    .then(res => res.json())
    .then(data => {
      console.log('Backend Engine Awake & Ready:', data);
    })
    .catch(err => {
      console.warn('Backend server ping notice (may be sleeping or local):', err.message);
    });

  if (!db) {
    statusText.textContent = 'Firebase Config Required';
    statusPill.className = 'status-pill paused';
    return;
  }

  // Safety fallback for status text if Firestore connection takes time or is blocked by adblockers
  let isFirestoreConnected = false;
  const connectionTimeout = setTimeout(() => {
    if (!isFirestoreConnected && statusText.textContent === 'Connecting...') {
      statusText.textContent = 'Ready (Sandbox / Offline)';
      statusPill.className = 'status-pill active';
    }
  }, 3500);

  // 1. Live Sync Engine Settings from Firestore
  db.collection('settings').doc('config').onSnapshot((doc) => {
    isFirestoreConnected = true;
    clearTimeout(connectionTimeout);

    if (doc.exists) {
      const data = doc.data();

      // Master switch
      const isEnabled = data.enabled !== undefined ? data.enabled : true;
      masterToggle.checked = isEnabled;
      if (isEnabled) {
        statusPill.className = 'status-pill active';
        statusText.textContent = 'Automation Active';
      } else {
        statusPill.className = 'status-pill paused';
        statusText.textContent = 'Automation Paused';
      }

      // Mode
      if (data.mode === 'keyword') {
        modeKeywordRadio.checked = true;
      } else if (data.mode === 'any') {
        modeAnyRadio.checked = true;
      } else {
        modeAiRadio.checked = true;
      }
      updateModeVisibility();

      // Inputs
      if (data.keywordTrigger !== undefined) keywordInput.value = data.keywordTrigger;
      if (data.customPrompt !== undefined) customPromptInput.value = data.customPrompt;
      if (data.dmTemplate !== undefined) dmTemplateInput.value = data.dmTemplate;
      if (data.replyCommentTemplate !== undefined) replyTemplateInput.value = data.replyCommentTemplate;
      if (data.backendUrl !== undefined && backendUrlInput) backendUrlInput.value = data.backendUrl || defaultBackendUrl;
      if (data.metaAccessToken !== undefined) metaTokenInput.value = data.metaAccessToken;
      if (data.metaVerifyToken !== undefined) metaVerifyInput.value = data.metaVerifyToken;
      if (data.geminiApiKey !== undefined) geminiKeyInput.value = data.geminiApiKey;
    } else {
      // First time initialization
      statusText.textContent = 'New Project Setup';
      statusPill.className = 'status-pill active';
    }
  }, (err) => {
    console.error('Settings Listener Error:', err);
    isFirestoreConnected = true;
    clearTimeout(connectionTimeout);
    statusText.textContent = 'Ready (Sandbox / Offline)';
    statusPill.className = 'status-pill active';
  });

  // 2. Handle Master Toggle Change
  masterToggle.addEventListener('change', () => {
    const isEnabled = masterToggle.checked;
    db.collection('settings').doc('config').set({
      enabled: isEnabled
    }, { merge: true }).catch(err => {
      console.error('Error updating master toggle:', err);
    });
  });

  // 3. Handle Form Submit (Save Settings)
  configForm.addEventListener('submit', (e) => {
    e.preventDefault();

    let selectedMode = 'ai';
    if (modeKeywordRadio.checked) selectedMode = 'keyword';
    if (modeAnyRadio.checked) selectedMode = 'any';

    const updatedSettings = {
      enabled: masterToggle.checked,
      mode: selectedMode,
      keywordTrigger: keywordInput.value.trim(),
      customPrompt: customPromptInput.value.trim(),
      dmTemplate: dmTemplateInput.value.trim(),
      replyCommentTemplate: replyTemplateInput.value.trim(),
      backendUrl: backendUrlInput ? backendUrlInput.value.trim() : '',
      metaAccessToken: metaTokenInput.value.trim(),
      metaVerifyToken: metaVerifyInput.value.trim(),
      geminiApiKey: geminiKeyInput.value.trim()
    };

    const targetDocRef = currentTargetMediaId === 'GLOBAL'
      ? db.collection('settings').doc('config')
      : db.collection('post_rules').doc(currentTargetMediaId);

    targetDocRef.set(updatedSettings, { merge: true })
      .then(() => {
        saveToast.innerHTML = `<i class="fa-solid fa-circle-check"></i> Saved rules for ${currentTargetMediaTitle}!`;
        saveToast.classList.remove('hidden');
        setTimeout(() => saveToast.classList.add('hidden'), 3000);
      })
      .catch((err) => {
        alert('Error saving settings: ' + err.message);
      });
  });

  // 4. Live Sync Activity Logs & Metrics
  db.collection('logs').orderBy('timestamp', 'desc').limit(50).onSnapshot((snapshot) => {
    let totalCount = 0;
    let dmsCount = 0;
    let errorsCount = 0;

    if (snapshot.empty) {
      if (emptyFeed) emptyFeed.style.display = 'flex';
      activityFeed.innerHTML = '';
      if (emptyFeed) activityFeed.appendChild(emptyFeed);
      updateMetrics(0, 0, 0, 0);
      return;
    }

    if (emptyFeed) emptyFeed.style.display = 'none';
    activityFeed.innerHTML = '';

    snapshot.docs.forEach((doc) => {
      const log = doc.data();
      totalCount++;

      if (log.dmSent) dmsCount++;
      if (log.status === 'failed' || log.status === 'skipped_automation_disabled') errorsCount++;

      // Create Feed Element
      const feedItem = createFeedItemElement(log);
      activityFeed.appendChild(feedItem);
    });

    const matchRate = totalCount > 0 ? Math.round((dmsCount / totalCount) * 100) : 0;
    updateMetrics(totalCount, dmsCount, matchRate, errorsCount);
  }, (err) => {
    console.error('Logs Listener Error:', err);
  });

  function updateMetrics(total, dms, matchRate, errors) {
    metricTotal.textContent = total;
    metricDms.textContent = dms;
    metricMatch.textContent = `${matchRate}%`;
    metricErrors.textContent = errors;
  }

  function createFeedItemElement(log) {
    const div = document.createElement('div');
    div.className = 'feed-item';

    const timeStr = log.timestamp && log.timestamp.toDate 
      ? log.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : 'Just now';

    let badgeClass = 'badge-ignored';
    let badgeLabel = log.status || 'INGESTED';

    if (log.status === 'success' || log.dmSent) {
      badgeClass = 'badge-success';
      badgeLabel = 'DM SENT 📥';
    } else if (log.status === 'failed') {
      badgeClass = 'badge-failed';
      badgeLabel = 'FAILED ❌';
    } else if (log.status === 'processing') {
      badgeClass = 'badge-processing';
      badgeLabel = 'ANALYZING ⏳';
    } else if (log.status === 'ignored') {
      badgeClass = 'badge-ignored';
      badgeLabel = 'NO TRIGGER ⏭️';
    }

    div.innerHTML = `
      <div class="feed-item-head">
        <span class="user-tag">@${log.username || 'user'}</span>
        <span class="feed-time">${timeStr}</span>
      </div>
      <div class="feed-comment">"${log.commentText || ''}"</div>
      <div class="feed-item-foot">
        <span class="feed-reasoning">${log.aiReasoning || 'Processed'}</span>
        <span class="badge ${badgeClass}">${badgeLabel}</span>
      </div>
    `;

    return div;
  }

  // 6. Handle Preset Button Clicks
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetType = btn.getAttribute('data-preset');

      if (presetType === 'ebook') {
        modeKeywordRadio.checked = true;
        updateModeVisibility();
        keywordInput.value = 'pdf, book, guide, link';
        dmTemplateInput.value = 'Hey there! 👋 Thanks for commenting! Here is your free PDF guide download link: https://example.com/guide.pdf';
        replyTemplateInput.value = 'Sent you the PDF link! Check your inbox 📥✨';
      } else if (presetType === 'course') {
        modeAiRadio.checked = true;
        updateModeVisibility();
        customPromptInput.value = 'Trigger DM if commenter asks about price, enrollment, how to join, or webinar registration details.';
        dmTemplateInput.value = 'Thanks for your interest in the course! 🎓 Here is the link with pricing & enrollment details: https://example.com/course';
        replyTemplateInput.value = 'Sent you the enrollment link in DMs! 📩🎓';
      } else if (presetType === 'emoji') {
        modeKeywordRadio.checked = true;
        updateModeVisibility();
        keywordInput.value = '🔥';
        dmTemplateInput.value = 'Appreciate the 🔥 love on my reel! Here is your exclusive bonus link: https://example.com/vip';
        replyTemplateInput.value = 'Appreciate the 🔥! Sent you a secret link 📥';
      } else if (presetType === 'all') {
        modeAnyRadio.checked = true;
        updateModeVisibility();
        dmTemplateInput.value = 'Hey! 👋 Thanks for commenting on my reel! Here is the link you requested: https://example.com/info';
        replyTemplateInput.value = 'Sent you a DM! Check your inbox 📥✨';
      }

      // Highlight preset button momentarily
      btn.style.transform = 'scale(0.96)';
      setTimeout(() => btn.style.transform = '', 150);

      // Save automatically for current active target
      configForm.dispatchEvent(new Event('submit'));
    });
  });

  // 7. Live Activity Feed Search & Status Filtering
  const feedSearchInput = document.getElementById('feed-search-input');
  const filterBtns = document.querySelectorAll('.filter-btn');
  let activeFilterStatus = 'all';

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilterStatus = btn.getAttribute('data-filter');
      filterFeedItems();
    });
  });

  if (feedSearchInput) {
    feedSearchInput.addEventListener('input', filterFeedItems);
  }

  function filterFeedItems() {
    const query = (feedSearchInput ? feedSearchInput.value : '').toLowerCase().trim();
    const feedItems = activityFeed.querySelectorAll('.feed-item');

    feedItems.forEach(item => {
      const username = (item.querySelector('.user-tag') ? item.querySelector('.user-tag').textContent : '').toLowerCase();
      const commentText = (item.querySelector('.feed-comment') ? item.querySelector('.feed-comment').textContent : '').toLowerCase();
      const badgeText = (item.querySelector('.badge') ? item.querySelector('.badge').textContent : '').toLowerCase();

      const matchesQuery = !query || username.includes(query) || commentText.includes(query) || badgeText.includes(query);

      let matchesStatus = true;
      if (activeFilterStatus === 'success') {
        matchesStatus = badgeText.includes('dm sent');
      } else if (activeFilterStatus === 'ignored') {
        matchesStatus = badgeText.includes('no trigger');
      } else if (activeFilterStatus === 'failed') {
        matchesStatus = badgeText.includes('failed');
      }

      if (matchesQuery && matchesStatus) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  }

  // 8. Enhanced Interactive Sandbox Simulator
  testCommentBtn.addEventListener('click', () => {
    const userPromptText = prompt("Enter a test Instagram comment (or leave blank for a random comment):", "Could you please send me the PDF guide link?");
    
    if (userPromptText === null) return; // User cancelled

    const commentText = userPromptText.trim() || "Can I get the link please?";
    const testUsername = 'test_user_' + Math.floor(Math.random() * 900 + 100);
    const testId = 'sim_' + Date.now();

    let isTriggered = false;

    if (modeAnyRadio.checked) {
      isTriggered = true;
    } else if (modeKeywordRadio.checked) {
      const kw = keywordInput.value.toLowerCase() || 'link';
      const triggers = kw.split(',').map(k => k.trim());
      isTriggered = triggers.some(t => t && commentText.toLowerCase().includes(t));
    } else {
      isTriggered = commentText.toLowerCase().includes('link') || commentText.toLowerCase().includes('pdf') || commentText.toLowerCase().includes('guide') || commentText.toLowerCase().includes('price');
    }

    db.collection('logs').doc(testId).set({
      commentId: testId,
      username: testUsername,
      userId: 'user_' + Math.floor(Math.random() * 10000),
      commentText: commentText,
      mediaId: currentTargetMediaId,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      status: isTriggered ? 'success' : 'ignored',
      modeUsed: modeKeywordRadio.checked ? 'keyword' : (modeAnyRadio.checked ? 'any' : 'ai'),
      aiReasoning: isTriggered 
        ? `Sandbox test matched target rule for [${currentTargetMediaTitle}]` 
        : `Sandbox test — no trigger condition met`,
      dmSent: isTriggered,
      commentReplied: isTriggered,
      error: null
    }).then(() => {
      saveToast.innerHTML = `<i class="fa-solid fa-flask"></i> Simulated comment from @${testUsername}!`;
      saveToast.classList.remove('hidden');
      setTimeout(() => saveToast.classList.add('hidden'), 3000);
    }).catch(err => {
      console.error('Error adding test comment:', err);
    });
  });
});
