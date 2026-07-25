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
| Wallet connect | 🔜 Later |

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
