// Shared UI fragments used across pages.

// The pulse-line motif echoes the heartbeat inside the BlessMed logo.
// Used as a quiet divider between sections instead of a plain <hr>.
const PULSE_DIVIDER_SVG = `
<svg class="pulse-divider" viewBox="0 0 600 28" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
  <polyline points="0,14 220,14 240,4 258,24 276,14 600,14"
    fill="none" stroke="#17A398" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function insertPulseDivider(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = PULSE_DIVIDER_SVG;
}

function showAlert(containerId, message, type = 'error') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function clearAlert(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = '';
}

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
