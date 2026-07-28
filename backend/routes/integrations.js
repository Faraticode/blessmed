const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const StepLog = require('../models/StepLog');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// Google Health API (health.googleapis.com) — as of 2026 this is the single
// replacement for both the old Google Fit REST API and the legacy Fitbit Web
// API, so connecting it covers Fitbit devices, Pixel Watch, and other
// Google-linked trackers in one integration.
//
// Docs: https://developers.google.com/health
// Requires a project registered in Google Cloud Console with the Health API
// enabled, and these env vars set on the backend:
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, APP_BASE_URL
// ---------------------------------------------------------------------------

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_HEALTH_API = 'https://health.googleapis.com/v4';
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// The browser can't attach an Authorization header to a top-level redirect
// to Google, so we verify the user's session token here and carry their
// identity through the OAuth round trip inside the signed `state` param
// instead (short-lived, single purpose — not the login token itself).
router.get('/connect/google', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(401).send('Missing session token.');

  let userId;
  try {
    userId = jwt.verify(token, process.env.JWT_SECRET).userId;
  } catch {
    return res.status(401).send('Session expired. Please log back into BlessMed and try again.');
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
    return res.status(500).send('Google Health isn\'t configured on this server yet (missing GOOGLE_CLIENT_ID / GOOGLE_REDIRECT_URI).');
  }

  const state = jwt.sign({ userId, purpose: 'google_health_connect' }, process.env.JWT_SECRET, { expiresIn: '10m' });

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_SCOPE,
    state
  });

  res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
});

router.get('/callback/google', async (req, res) => {
  const { code, state, error } = req.query;
  const frontendBase = process.env.APP_BASE_URL || '/';

  if (error) return res.redirect(`${frontendBase}/steps.html?google=denied`);
  if (!code || !state) return res.redirect(`${frontendBase}/steps.html?google=error`);

  let userId;
  try {
    const decoded = jwt.verify(state, process.env.JWT_SECRET);
    if (decoded.purpose !== 'google_health_connect') throw new Error('bad state');
    userId = decoded.userId;
  } catch {
    return res.redirect(`${frontendBase}/steps.html?google=error`);
  }

  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        code,
        grant_type: 'authorization_code'
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenData.error_description || tokenData.error || 'Token exchange failed.');

    await User.findByIdAndUpdate(userId, {
      googleHealth: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token, // only returned on first consent — we don't overwrite with undefined below
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        connectedAt: new Date()
      }
    });

    res.redirect(`${frontendBase}/steps.html?google=connected`);
  } catch (err) {
    console.error('Google Health OAuth callback failed:', err.message);
    res.redirect(`${frontendBase}/steps.html?google=error`);
  }
});

// Refreshes the access token if it's expired (or close to it), using the
// stored refresh token. Returns a usable access token, or null if the user
// needs to reconnect (e.g. refresh token was revoked).
async function getFreshAccessToken(user) {
  const gh = user.googleHealth;
  if (!gh || !gh.refreshToken) return null;

  const stillValid = gh.accessToken && gh.expiresAt && new Date(gh.expiresAt).getTime() - Date.now() > 60000;
  if (stillValid) return gh.accessToken;

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: gh.refreshToken,
      grant_type: 'refresh_token'
    })
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) return null;

  user.googleHealth.accessToken = tokenData.access_token;
  user.googleHealth.expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
  await user.save();

  return tokenData.access_token;
}

// Pulls today's step total from the Google Health API and merges it into
// today's StepLog (taking the higher of what's already saved vs. what
// Google reports, so this never silently erases a larger manual/auto-tracked
// count).
router.post('/sync/google', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.googleHealth?.refreshToken) {
      return res.status(400).json({ message: 'Google Health isn\'t connected yet.' });
    }

    const accessToken = await getFreshAccessToken(user);
    if (!accessToken) {
      return res.status(401).json({ message: 'Google Health access expired. Please reconnect.' });
    }

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);

    const rollupRes = await fetch(`${GOOGLE_HEALTH_API}/users/me/dataTypes/steps/dataPoints:rollUp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: { startTime: startOfDay.toISOString(), endTime: endOfDay.toISOString() }
      })
    });
    const rollupData = await rollupRes.json();
    if (!rollupRes.ok) throw new Error(rollupData.error?.message || 'Google Health request failed.');

    // The rollup response bundles totals by data point; sum whatever count
    // fields it returns for the steps type.
    const googleSteps = (rollupData.dataPoints || rollupData.rollups || [])
      .reduce((sum, dp) => sum + (dp.steps?.count || dp.value || 0), 0);

    const date = todayISO();
    const existing = await StepLog.findOne({ user: req.userId, date });
    const mergedSteps = Math.max(existing?.steps || 0, googleSteps);

    const log = await StepLog.findOneAndUpdate(
      { user: req.userId, date },
      { $set: { steps: mergedSteps } },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    res.json({ message: 'Synced from Google Health.', googleSteps, log });
  } catch (err) {
    res.status(500).json({ message: 'Could not sync with Google Health.', error: err.message });
  }
});

router.delete('/google', requireAuth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, {
      googleHealth: { accessToken: null, refreshToken: null, expiresAt: null, connectedAt: null }
    });
    res.json({ message: 'Disconnected from Google Health.' });
  } catch (err) {
    res.status(500).json({ message: 'Could not disconnect.', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Apple Health — there is no public web API for it (HealthKit only exists
// inside native iOS apps). The workable bridge is a third-party iOS app like
// "Health Auto Export" that can push HealthKit data to a custom webhook URL
// on a schedule. We give each user a unique, unguessable URL for that.
// ---------------------------------------------------------------------------

router.post('/apple/regenerate', requireAuth, async (req, res) => {
  try {
    const token = crypto.randomBytes(24).toString('hex');
    await User.findByIdAndUpdate(req.userId, { appleWebhookToken: token });
    res.json({ message: 'Webhook link generated.', webhookPath: `/api/integrations/apple/webhook/${token}` });
  } catch (err) {
    res.status(500).json({ message: 'Could not generate a webhook link.', error: err.message });
  }
});

// Public endpoint (no requireAuth) — the random token in the URL is the
// credential, the same way a calendar "secret iCal URL" works.
router.post('/apple/webhook/:token', async (req, res) => {
  try {
    const user = await User.findOne({ appleWebhookToken: req.params.token });
    if (!user) return res.status(404).json({ message: 'Unknown webhook link.' });

    // "Health Auto Export" and similar apps send a JSON body shaped roughly
    // like { data: { metrics: [ { name: "step_count", data: [ { qty, date } ] } ] } }
    // or a flatter { steps: 8342, date: "2026-07-28" } depending on how the
    // automation is configured. We accept either.
    const body = req.body || {};
    let steps = body.steps;
    let date = body.date || todayISO();

    if (steps === undefined && body.data?.metrics) {
      const stepMetric = body.data.metrics.find(m => m.name === 'step_count' || m.name === 'steps');
      if (stepMetric?.data?.length) {
        steps = stepMetric.data.reduce((sum, d) => sum + (d.qty || d.value || 0), 0);
        date = (stepMetric.data[0].date || date).slice(0, 10);
      }
    }

    if (steps === undefined || steps === null || isNaN(steps)) {
      return res.status(400).json({ message: 'No recognizable step data in this payload.' });
    }

    const existing = await StepLog.findOne({ user: user._id, date });
    const mergedSteps = Math.max(existing?.steps || 0, Math.round(steps));

    await StepLog.findOneAndUpdate(
      { user: user._id, date },
      { $set: { steps: mergedSteps } },
      { upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    res.json({ message: 'Steps received.', steps: mergedSteps, date });
  } catch (err) {
    res.status(500).json({ message: 'Could not process this webhook.', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Status — the Connect card on the frontend reads this once to know what to
// show for each provider.
// ---------------------------------------------------------------------------

router.get('/status', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const appBase = process.env.APP_BASE_URL || '';

    res.json({
      google: {
        connected: !!user.googleHealth?.refreshToken,
        connectedAt: user.googleHealth?.connectedAt || null
      },
      apple: {
        webhookUrl: user.appleWebhookToken ? `${appBase}/api/integrations/apple/webhook/${user.appleWebhookToken}` : null
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Could not load integration status.', error: err.message });
  }
});

module.exports = router;
