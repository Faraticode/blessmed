# BlessMed — MVP v1.0

**Your Health. Your Data. Your Future.**

A personal health records app: sign up, build a health profile, store your
prescriptions/lab results/vaccination cards, generate an emergency QR code,
and read daily health tips.

## Stack

- **Frontend:** Plain HTML, CSS, JavaScript (no build step, no framework)
- **Backend:** Node.js + Express
- **Database:** MongoDB (via Mongoose)
- **Auth:** JWT (JSON Web Tokens) + bcrypt password hashing
- **File uploads:** Multer (prescriptions, lab results, vaccination cards)
- **QR codes:** the `qrcode` npm package

## What's included in this MVP

| Feature | Status |
|---|---|
| Sign up / log in (JWT auth) | ✅ |
| Personal Health Profile (create, read, update, delete) | ✅ |
| Digital Health Records — upload/view/delete PDFs & images | ✅ |
| Emergency QR Code (blood group, allergies, emergency contact) | ✅ |
| Health Tips feed (with category filter) | ✅ |
| Medication reminders | 🔜 Phase 2 |
| AI Health Assistant chatbot | 🔜 Phase 2 |
| Stacks blockchain: wallet connect, on-chain record verification, reward points | ✅ Testnet demo |
| Daily step tracking with milestone rewards | ✅ |
| AI-generated health reminders (Claude API) | ✅ |
| Profile picture | ✅ |

## New features in this update

- **Steps (`steps.html`)** — log a daily step count; hitting 5,000 / 10,000 /
  15,000 / 20,000 steps in a day unlocks an on-chain points claim (2/5/8/12
  points respectively). Only the highest milestone reached each day can be
  claimed, once — the backend tracks that in `StepLog.claimedMilestone`.
  Steps can now come from three sources, which all merge into the same
  daily total (the higher value wins, so none of them can undercut another):
  - **Manual entry** — type a number in, same as before.
  - **Automatic tracking (`js/pedometer.js`)** — uses the phone's motion
    sensor to count steps while the page is open in the foreground. No
    account needed, but it only counts while the tab stays open and active
    — browsers suspend sensors in the background, and there's no way around
    that from a website.
  - **Connected trackers ("Connect a tracker" card)** — for steps counted
    even when BlessMed isn't open:
    - *Google Health* — OAuth-connect a Fitbit, Pixel Watch, or other
      Google-linked device (`backend/routes/integrations.js`). Needs
      `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI`
      set (see below) and a project registered at
      https://developers.google.com/health. Note this API is quite new —
      double-check the current data-point/rollup response shape against
      Google's docs before relying on it in production, in case it's
      changed since this was written.
    - *Apple Health* — Apple has no public web API for HealthKit data, so
      there's no way to pull it directly from a server. The workaround
      here is a per-user webhook URL (`/api/integrations/apple/webhook/:token`)
      that a bridge app on the phone — e.g. "Health Auto Export" — can be
      set up to push a daily step count to on a schedule. Click "Get
      webhook URL" on the Steps page for your link and paste it into that
      app's automation settings.
- **Reminders (`reminders.html`)** — click "Generate suggestions" to get
  3–5 general wellness reminders from Claude, based on your health profile
  (age, conditions, allergies). It never names specific medications or
  gives medical advice — just general prompts like "take your morning
  medication" or "drink water." Accept a suggestion to save it, or add
  your own manually. **Limitation to know:** reminders fire via a
  background check while the Reminders page is open in your browser —
  there's no server-push notification system here, so they won't fire if
  the tab/app is closed.
- **Profile picture** — upload one from the Health Profile page; it shows
  in the sidebar next to your name everywhere in the app.
- **Blockchain moved up in the sidebar**, and restyled with a dark,
  Stacks-purple theme (distinct from the rest of the app's clinical white)
  so it reads as its own "on-chain" space.

### One more environment variable needed

The AI reminders feature needs an Anthropic API key. Get one at
https://console.anthropic.com/settings/keys, then:

- **Locally:** add to your `.env` file:
  ```
  ANTHROPIC_API_KEY=your_key_here
  ```
- **On Render:** go to your Web Service → Environment → Add Environment
  Variable → Key: `ANTHROPIC_API_KEY`, Value: your key → Save. Render will
  redeploy automatically.

Without this key, every other feature keeps working — only the "Generate
suggestions" button on the Reminders page will show an error until it's set.

### Setting up Google Health (optional)

Only needed if you want the "Connect a tracker → Google Health" button to
work; everything else (manual entry, phone-sensor auto-tracking, Apple
Health webhook) works without it.

1. Go to https://developers.google.com/health and create/enable a project
   in Google Cloud Console for the Health API.
2. Under APIs & Services → Credentials, create an OAuth 2.0 Client ID
   (type: Web application).
3. Add an authorized redirect URI matching `GOOGLE_REDIRECT_URI` below
   (e.g. `https://your-domain.com/api/integrations/callback/google`).
4. Add to your `.env`:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=https://your-domain.com/api/integrations/callback/google
   APP_BASE_URL=https://your-domain.com
   ```
5. While your OAuth consent screen is in "Testing" mode, Google issues
   short-lived refresh tokens (they expire after 7 days) — publish the
   consent screen before relying on this for real users.

## Blockchain feature (Stacks testnet)

BlessMed includes an optional `blockchain.html` page that connects a Stacks
wallet (Leather, Xverse, etc.) and talks to a small Clarity smart contract
at `contracts/blessmed-registry.clar`. It does two things:

1. **Record verification** — computes a SHA-256 fingerprint of a file in
   the browser and stores just that fingerprint on-chain (never the file
   itself), so you can later prove a specific file existed at a specific
   time without exposing its contents.
2. **Reward points** — a simple, self-reported point tracker for healthy
   actions, stored on-chain per wallet address.

This is a **testnet demo** — it costs nothing, but also isn't connected to
mainnet STX or real value.

### Deploying the smart contract

You don't need any CLI tools for this — it's all done in the browser:

1. Install a Stacks wallet browser extension, e.g. [Leather](https://leather.io)
   or [Xverse](https://xverse.app), and switch it to **Testnet** in its settings
2. Get free testnet STX from the faucet built into
   [the Stacks Explorer Sandbox](https://explorer.hiro.so/sandbox/deploy?chain=testnet)
   (there's a "Get testnet STX" button once your wallet is connected)
3. Go to https://explorer.hiro.so/sandbox/deploy?chain=testnet and connect
   your wallet
4. Copy the full contents of `contracts/blessmed-registry.clar` into the
   code editor
5. Give it a contract name, e.g. `blessmed-registry`
6. Click **Deploy** and confirm in your wallet — wait for the transaction
   to confirm (the Explorer will show it as pending, then successful)
7. Once deployed, note your wallet's address (starts with `ST...` on
   testnet) — the deployed contract's full identifier is
   `YOUR_ADDRESS.blessmed-registry`

### Connecting the frontend to your deployed contract

Open `frontend/js/stacks.js` and update this line near the top:

```js
const CONTRACT_ADDRESS = 'ST000000000000000000002AMW42H'; // placeholder — replace after deploying
```

Replace the placeholder with **your own** testnet address from step 7
above (just the address, not the contract name — that's already set via
`CONTRACT_NAME` on the next line). Save, then redeploy the frontend as
usual (commit + push, or re-upload if hosting separately).

### Using it

Open `blockchain.html` in the app (there's a "Blockchain" link in the
sidebar), click **Connect Wallet**, and approve the connection in your
wallet extension. From there you can earn points, register a file's hash,
and check whether a file has already been registered.

## Getting set up on your machine

### 1. Install prerequisites
- [Node.js](https://nodejs.org) (v18 or later)
- A MongoDB database — this project uses **MongoDB Atlas** (cloud), so you don't need to install MongoDB locally

### 2. Install backend dependencies
```bash
cd backend
npm install
```

### 3. Set up MongoDB Atlas
1. Create a free account at https://www.mongodb.com/cloud/atlas/register
2. Create a new project, then build a free **M0** cluster
3. **Database Access** → add a database user (username + password)
4. **Network Access** → add your IP address (or "Allow Access from Anywhere" for local dev/testing)
5. On your cluster, click **Connect** → **Drivers**, and copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### 4. Configure environment variables
```bash
cp .env.example .env
```
Open `.env` and:
- Paste your Atlas connection string into `MONGO_URI`, filling in your username/password and adding `blessmed` as the database name (see the example already in `.env.example`)
- Set your own `JWT_SECRET` (any long random string)

### 5. (Optional) Seed sample health tips
```bash
node seedTips.js
```

### 6. Start the server
```bash
npm start
```
You should see:
```
BlessMed database connected: blessmed
BlessMed server running on http://localhost:5000
```

### 7. Open the app
Go to **http://localhost:5000** in your browser. The Express server serves
the frontend directly, so there's nothing extra to run — no separate frontend
server, no build step.

## Project structure

```
blessmed/
├── backend/
│   ├── config/db.js          MongoDB connection
│   ├── models/                User, HealthProfile, HealthRecord, HealthTip
│   ├── routes/                auth, profile, records, emergency, tips
│   ├── middleware/            auth (JWT check), upload (Multer config)
│   ├── uploads/                uploaded files land here
│   ├── seedTips.js            populates sample health tips
│   ├── server.js              app entry point
│   └── .env.example
└── frontend/
    ├── login.html / signup.html
    ├── dashboard.html
    ├── profile.html           health profile CRUD
    ├── records.html           health records CRUD (with file upload)
    ├── emergency.html         emergency QR code
    ├── tips.html               health tips feed
    ├── css/                    style.css (design tokens), auth.css
    ├── js/                     api.js, nav.js, ui.js
    └── assets/logo.jpg
```

## How auth works

1. Sign up or log in → the server returns a JWT.
2. The frontend stores the token in `localStorage` (`js/api.js` — the `Auth` object).
3. Every request to a protected route sends the token as
   `Authorization: Bearer <token>`.
4. The backend's `middleware/auth.js` verifies the token before allowing
   access to profile, records, emergency, and tips routes.

## Notes on the Emergency QR code

The QR code encodes **only**: name, blood group, allergies, and emergency
contact — nothing else from the account. It's generated fresh from the
current health profile each time the page loads, so it always reflects your
latest information.

## Suggested next steps (Phase 2)

- **Medication reminders:** add a `Medication` model (name, dose, times) and
  either a background job (e.g. `node-cron`) or a browser-side notification
  scheduler.
- **AI Health Assistant:** add a `/api/chat` route that calls the Anthropic
  API, with a system prompt that keeps it to explaining terms, general
  health info, and always reminding the user it isn't a substitute for a
  doctor.
- **Deployment:** once you're ready to host this, MongoDB Atlas (free tier)
  for the database plus Render or Railway for the Node server both work
  well with this exact structure.
