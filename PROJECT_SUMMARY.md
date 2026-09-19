# 📖 InstaAI Automation Engine - Project Documentation & Handoff Summary for Claude

**Project Name:** InstaAI Automation (NothingDM)  
**Target:** Private Instagram Comment-to-DM AI Automation  
**Live Dashboard URL:** [https://ojashwa-nothing-automation.web.app](https://ojashwa-nothing-automation.web.app)  
**Live Render Webhook URL:** `https://nothingdm.onrender.com/webhook`  
**Firebase Project ID:** `ojashwa-nothing-automation`  
**GitHub Repository:** `ojashwa-py/NothingDM`  

---

## 🎯 Problem Statement & Solved Challenges

### The Core Problem Addressed
Instagram content creators lose high-intent leads because manually monitoring comments on viral Reels/Posts and manually messaging each user in DMs is time-consuming, prone to delays, and impossible to scale 24/7. Standard link-in-bio setups suffer from low click-through conversion rates because users leave the Reel to navigate bios.

### Solved Technical & Integration Challenges
During setup and deployment, the following specific engineering challenges were encountered and resolved:

1. **Meta Webhook Verification Failure (`404 Not Found` / Token Validation):**
   - *Problem:* Meta Developer Portal failed webhook verification because the default Firebase Hosting rewrite expected a deployed Cloud Function (`api`) on the Firebase Blaze plan.
   - *Solution:* Deployed a standalone Node.js Express server to Render (`nothingdm.onrender.com`), handling the `GET /webhook` challenge (`hub.mode`, `hub.verify_token`, `hub.challenge`) returning `200 OK`.

2. **Render Dependency Resolution (`MODULE_NOT_FOUND`):**
   - *Problem:* Render failed to start `functions/index.js` or `server.js` due to missing `firebase-functions` and `firebase-admin` modules in the root directory.
   - *Solution:* Updated the root `package.json` with all required runtime dependencies (`firebase-admin`, `firebase-functions`, `express`, `cors`, `axios`, `@google/generative-ai`, `dotenv`) so both entry points build seamlessly.

3. **Dashboard UI JS Variable Conflict:**
   - *Problem:* The live activity feed was stuck on *"Waiting for incoming Instagram comments..."* because of duplicate `const` element declarations in `public/app.js` blocking the script execution.
   - *Solution:* Refactored `app.js`, cleaned up element declarations, and re-deployed to Firebase Hosting.

4. **Meta Graph API Webhook Behavior in Development Mode:**
   - *Problem:* Comments posted by the creator account itself on its own posts were not generating webhook events.
   - *Solution:* Verified Meta Graph API policy (Meta suppresses self-comment webhooks) and configured **Instagram Testers** roles in Meta App settings to enable external account testing in Development mode.

---

## 🌟 Executive Summary

InstaAI Automation is a private, self-hosted AI automation tool built for Instagram content creators. It listens for incoming Instagram post/reel comments via Meta Webhooks, evaluates comment intent using Google Gemini AI or keyword rules, and automatically dispatches private direct messages (DMs) and public comment replies via Meta's Instagram Graph API (`v19.0`).

---

## 🏗️ Architecture & Technology Stack

| Component | Technology Used | Description |
| :--- | :--- | :--- |
| **Frontend UI** | HTML5, Vanilla CSS3, Vanilla JS | Glassmorphism dark-theme dashboard with real-time Firestore listeners. |
| **Backend API** | Node.js Express (`server.js` & `functions/index.js`) | Standalone Express server hosted on Render (`nothingdm.onrender.com`) handling webhooks & Graph API calls. |
| **Database** | Cloud Firestore | Real-time database storing engine configs, post-specific rules, and live activity logs. |
| **Hosting** | Firebase Hosting & Render | Web Dashboard on Firebase CDN (`ojashwa-nothing-automation.web.app`); Webhook engine on Render. |
| **AI Engine** | Google Gemini 1.5 Flash API (`@google/generative-ai`) | Performs natural language processing and intent detection on incoming comments. |
| **Social API** | Meta Instagram Graph API `v19.0` | Receives comment webhooks, sends private DMs (`/{comment-id}/messages`), and posts replies (`/{comment-id}/replies`). |

---

## 🚀 Key Features Implemented

### 1. 🎛️ Three Evaluation Modes
- **Gemini AI Mode:** Smart intent detection using custom prompt rules.
- **Word / Emoji Mode:** Triggers on exact words or emojis (e.g. `🔥`, `pdf`, `book`, `link`).
- **ANY Comment Mode:** Triggers automated DMs for every single comment posted.

### 2. 🎬 Reels & Posts Selection Gallery
- Displays a visual grid of uploaded Instagram Reels and Posts fetched via Graph API (`GET /{ig_account_id}/media`).
- Allows assigning **post-specific rules** (e.g. Reel #1 gets PDF link, Reel #2 gets Gemini AI mode).
- Falls back to **Global Default Target** (`GLOBAL`) if no post-specific rule exists.

### 3. ⚡ 1-Click Automation Presets
- **E-Book / PDF Lead Magnet:** Pre-configures PDF download keyword rules.
- **Course / Webinar Invite:** Configures Gemini AI for pricing & registration intent.
- **Viral Emoji Blast (🔥):** Configures instant DMs for 🔥 comments.
- **Auto-DM Everyone:** Enables ANY comment mode with 1 click.

### 4. 🔍 Real-Time Feed Search & Status Filters
- Live activity stream powered by Firestore `onSnapshot`.
- Search by username, comment text, or status.
- Filter by status pills: `All`, `DMs Sent`, `No Trigger`, `Errors`.

### 5. 🧪 Interactive Sandbox Simulator
- Interactive prompt dialog allowing creators to test custom comments and simulate rule evaluation in real-time, streaming simulated events directly into the Firestore activity feed.

---

## 📁 Complete Project File Structure

```
ojashwa.nothing automation/
├── .env                     # Local environment secrets (Git-ignored)
├── .env.example             # Template for required environment variables
├── firebase.json            # Firebase deployment & routing configuration
├── firestore.rules          # Firestore database security rules
├── .firebaserc              # Firebase project mapping (ojashwa-nothing-automation)
├── package.json             # Root npm dependencies (express, firebase-admin, firebase-functions, @google/generative-ai, axios, dotenv)
├── server.js                # Standalone Express Webhook Server (Render entry point)
├── README.md                # General readme & quickstart
├── PROJECT_SUMMARY.md       # Comprehensive handoff documentation for Claude
├── public/                  # Frontend Web App (Hosted on Firebase)
│   ├── index.html           # Main Glassmorphism Dashboard UI
│   ├── style.css            # Dark mode glassmorphism styling & animations
│   ├── firebase-config.js   # Firebase Client SDK credentials & setup
│   └── app.js               # Dashboard JS logic, Firestore real-time listeners & presets
└── functions/               # Firebase Cloud Functions (Alternative backend)
    ├── index.js             # Express API, Meta Webhook handler & Gemini AI engine
    └── package.json         # Node backend dependencies
```

---

## 🛠️ Configuration & Credentials

### Environment Variables (`.env` and Render Environment Settings)
```env
META_PAGE_ACCESS_TOKEN=YOUR_META_PAGE_ACCESS_TOKEN
META_VERIFY_TOKEN=my_insta_automation_verify_token_2026
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

### Verified Live Endpoints & Webhook
- **Render Backend Webhook URL:** `https://nothingdm.onrender.com/webhook`
- **Verify Token:** `my_insta_automation_verify_token_2026`
- **Meta Graph API Version:** `v19.0`
- **Subscribed Field:** `comments` (Status: **Subscribed**)

---

## 🚀 Deployment & Maintenance Guide

### Deploying Frontend Updates (Firebase Hosting)
```bash
firebase deploy --only hosting --project ojashwa-nothing-automation
```

### Deploying Backend Updates (Render Web Service)
```bash
git add .
git commit -m "Update backend engine"
git push origin main
# Render automatically builds and deploys from main branch
```

---

## 📝 Key Handoff Context for Claude
- Both **Render** (`https://nothingdm.onrender.com`) and **Firebase Hosting** (`https://ojashwa-nothing-automation.web.app`) are fully configured, linked, and verified with Meta Graph API `v19.0`.
- Webhook verification endpoint (`GET /webhook`) handles Meta's `hub.challenge` handshake smoothly.
- Firestore synchronization drives the real-time activity feed on the web UI (`onSnapshot` listeners).
