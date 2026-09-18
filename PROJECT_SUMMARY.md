# 📖 InstaAI Automation Engine - Project Documentation & Summary

**Project Name:** InstaAI Automation  
**Target:** Private Instagram Comment-to-DM AI Automation  
**Live Dashboard URL:** [https://ojashwa-nothing-automation.web.app](https://ojashwa-nothing-automation.web.app)  
**Firebase Project ID:** `ojashwa-nothing-automation`  

---

## 🌟 Executive Summary

InstaAI Automation is a private, self-hosted AI automation tool built for Instagram content creators. It listens for incoming post/reel comments via Meta Webhooks, evaluates comment intent using Google Gemini 1.5 Flash AI or specific keyword rules, and automatically sends private direct messages (DMs) and public comment replies via Meta's Instagram Graph API.

---

## 🏗️ Architecture & Technology Stack

| Component | Technology Used | Description |
| :--- | :--- | :--- |
| **Frontend UI** | HTML5, Vanilla CSS3, Vanilla JS | Glassmorphism dark-theme control dashboard with real-time UI updates. |
| **Backend API** | Firebase Cloud Functions (Node.js) | Serverless Express API handling webhooks, AI logic, and Meta API requests. |
| **Database** | Cloud Firestore | NoSQL real-time database storing engine configs, post rules, and live activity logs. |
| **Hosting** | Firebase Hosting | Fast global CDN hosting for the web dashboard. |
| **AI Engine** | Google Gemini 1.5 Flash API | Performs natural language processing and intent detection on comments. |
| **Social API** | Meta Instagram Graph API | Receives comment webhooks, dispatches DMs, and posts public comment replies. |

---

## 🚀 Key Features Implemented

### 1. 🎛️ Three Evaluation Modes
- **Gemini AI Mode:** Smart intent detection using custom prompt rules.
- **Word / Emoji Mode:** Triggers on exact words or emojis (e.g. `🔥`, `pdf`, `book`).
- **ANY Comment Mode:** Triggers automated DMs for every single comment posted.

### 2. 🎬 Reels & Posts Selection Gallery
- Displays a visual grid of uploaded Instagram Reels and Posts.
- Allows assigning **post-specific rules** (e.g. Reel #1 gets PDF link, Reel #2 gets Gemini AI mode).
- Falls back to **Global Default Target** if no post-specific rule exists.

### 3. ⚡ 1-Click Automation Presets
- **E-Book / PDF Lead Magnet:** Pre-configures PDF download rules.
- **Course / Webinar Invite:** Configures Gemini AI for pricing & registration intent.
- **Viral Emoji Blast (🔥):** Configures instant DMs for 🔥 comments.
- **Auto-DM Everyone:** Enables ANY comment mode with 1 click.

### 4. 🔍 Real-Time Feed Search & Status Filters
- Live activity stream powered by Firestore `onSnapshot`.
- Search by username, comment text, or status.
- Filter by status pills: `All`, `DMs Sent`, `No Trigger`, `Errors`.

### 5. 🧪 Interactive Sandbox Simulator
- Interactive prompt dialog allowing creators to test custom comments and simulate rule evaluation in real-time.

---

## 📁 Complete Project File Structure

```
ojashwa.nothing automation/
├── firebase.json            # Firebase deployment & routing configuration
├── firestore.rules          # Firestore database security rules
├── .firebaserc              # Firebase project mapping (ojashwa-nothing-automation)
├── package.json             # Root npm scripts
├── README.md                # General readme & quickstart
├── PROJECT_SUMMARY.md       # Comprehensive project documentation
├── public/                  # Frontend Web App
│   ├── index.html           # Main Glassmorphism Dashboard UI
│   ├── style.css            # Dark mode glassmorphism styling & animations
│   ├── firebase-config.js   # Browser-compatible Firebase SDK initialization
│   └── app.js               # Dashboard JS logic, Firestore listeners & presets
└── functions/               # Backend Cloud Functions
    ├── index.js             # Express API, Meta Webhook handler & Gemini AI engine
    └── package.json         # Node.js backend dependencies (@google/generative-ai, axios, express)
```

---

## 🛠️ Configuration & Deployment Guide

### Deployment Commands
To deploy updates to Firebase:

```bash
# Deploy Frontend UI & Database Rules (Free Plan compatible)
firebase deploy --only hosting,firestore --project ojashwa-nothing-automation

# Full Deployment including Cloud Functions (Requires Firebase Blaze Plan)
firebase deploy --project ojashwa-nothing-automation
```

### Meta Webhook Setup Summary
- **Callback URL:** `https://ojashwa-nothing-automation.web.app/webhook`
- **Verify Token:** `YOUR_CUSTOM_VERIFY_TOKEN` (your custom secret string)
- **Subscribed Field:** `comments`
