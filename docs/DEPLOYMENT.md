# NIRVAAT Deployment Guide: Render.com

This guide walks you through deploying **NIRVAAT** on [Render](https://render.com) as a production Node.js Web Service.

---

## 1. Prerequisites

1. A [GitHub](https://github.com) account with NIRVAAT pushed to your repository:
   `https://github.com/ramakrishnanyadav/NIRVAAT`
2. A [Render](https://render.com) account (free tier available).
3. A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/).

---

## 2. Option A: 1-Click Blueprint Deploy (Recommended)

NIRVAAT includes a `render.yaml` blueprint at the root of the repository.

1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** in the top right, then select **Blueprint**.
3. Connect your GitHub repository: `ramakrishnanyadav/NIRVAAT`.
4. Render will automatically detect `render.yaml`:
   - **Service Name**: `nirvaat-copilot`
   - **Runtime**: `Node`
   - **Build Command**: `pnpm install --no-frozen-lockfile && pnpm run build`
   - **Start Command**: `pnpm start`
   - **Health Check Path**: `/api/health`
5. Under Environment Variables, enter your **`GEMINI_API_KEY`**.
6. Click **Apply**. Render will install dependencies, build the Vite production assets, and launch the server.

---

## 3. Option B: Manual Web Service Setup

If you prefer configuring the Web Service manually:

1. In Render Dashboard, click **New +** $\rightarrow$ **Web Service**.
2. Select **Build and deploy from a Git repository**.
3. Choose `ramakrishnanyadav/NIRVAAT` and click **Connect**.
4. Configure the service settings:
   - **Name**: `nirvaat-copilot` (or your preferred name)
   - **Region**: Any (e.g. `Oregon (US West)` or `Singapore`)
   - **Branch**: `master` (or `main`)
   - **Root Directory**: Leave blank (root of repository)
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     pnpm install --no-frozen-lockfile && pnpm run build
     ```
   - **Start Command**:
     ```bash
     pnpm start
     ```
   - **Instance Type**: `Free`
5. Scroll down to **Environment Variables** and add:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Enables production bundle serving and SPA routing |
   | `GEMINI_API_KEY` | `AIzaSy...` | Your Google Gemini API Key |
   | `SESSION_SECRET` | *(Random 32+ char string)* | Used to sign anonymous session cookies |
6. In **Advanced Settings**:
   - **Health Check Path**: `/api/health`
   - **Auto-Deploy**: `Yes` (deploys automatically on every `git push`)
7. Click **Create Web Service**.

---

## 4. Verification After Deployment

Once the build completes and Render reports **Live**:

1. Click on the generated Render URL (e.g., `https://nirvaat-copilot.onrender.com`).
2. Test the health check endpoint:
   ```bash
   curl https://nirvaat-copilot.onrender.com/api/health
   ```
   Should return HTTP 200 with `{ "status": "healthy", "service": "nirvaat-copilot" }`.
3. Try generating an exposure-reduction plan on the Today tab or using quick presets.
4. Try testing red-flag triage by typing: *"Difficulty breathing and chest tightness"* $\rightarrow$ routes immediately to `/emergency`.

---

## 5. Troubleshooting

- **Cold Starts on Free Tier**: Render's free tier spins down after 15 minutes of inactivity. The first request after idle may take 30–50 seconds to warm up. Subsequent requests run at $<5\text{ms}$.
- **Missing Gemini API Key**: If `GEMINI_API_KEY` is not provided, NIRVAAT does not crash; it automatically operates in offline deterministic mode (Tier D physics engine), ensuring 100% uptime.
- **Port Binding**: Render dynamically injects the `PORT` environment variable (e.g. 10000). NIRVAAT automatically reads `process.env.PORT` and binds to `0.0.0.0:${PORT}`.
