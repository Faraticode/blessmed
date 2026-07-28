// pedometer.js — counts steps from the phone's motion sensor (devicemotion).
//
// How it works:
// 1. We read accelerationIncludingGravity on every devicemotion event.
// 2. A low-pass filter estimates the "gravity" component per axis; subtracting
//    that from the raw reading isolates the phone's actual movement.
// 3. We track the magnitude of that movement and look for it crossing back
//    and forth over a threshold — each up-crossing (after enough time has
//    passed since the last one) is counted as one step. This is the standard
//    lightweight peak-detection approach used by simple pedometers.
//
// Caveats (worth knowing, not hiding from the user):
// - Only counts steps while this page is open and in the foreground — phones
//   suspend JS timers/sensors for background tabs.
// - iOS Safari requires an explicit permission prompt, and it must be
//   triggered directly from a user tap (can't be requested on page load).
// - Accuracy is rough compared to a native pedometer — it's a reasonable demo
//   / supplement, not a medical-grade step counter.

class StepCounter {
  constructor({ onStep, sensitivity = 11.5, minStepIntervalMs = 300 } = {}) {
    this.onStep = onStep || (() => {});
    this.threshold = sensitivity;       // magnitude of movement that counts as a step
    this.minStepIntervalMs = minStepIntervalMs; // ignore steps faster than this (debounce)

    this.gravity = { x: 0, y: 0, z: 0 };
    this.filterAlpha = 0.8;             // low-pass filter smoothing factor
    this.lastStepAt = 0;
    this.overThreshold = false;
    this.tracking = false;

    this._handleMotion = this._handleMotion.bind(this);
  }

  static isSupported() {
    return typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
  }

  // iOS 13+ requires this to be called from within a user-gesture handler
  // (e.g. a button click), and only returns 'granted'/'denied' on iOS —
  // other browsers don't implement requestPermission at all.
  static async requestPermission() {
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const result = await DeviceMotionEvent.requestPermission();
        return result === 'granted';
      } catch {
        return false;
      }
    }
    // No permission API (Android/desktop) — assume allowed.
    return true;
  }

  start() {
    if (this.tracking || !StepCounter.isSupported()) return;
    this.tracking = true;
    this.lastStepAt = 0;
    window.addEventListener('devicemotion', this._handleMotion, true);
  }

  stop() {
    if (!this.tracking) return;
    this.tracking = false;
    window.removeEventListener('devicemotion', this._handleMotion, true);
  }

  _handleMotion(event) {
    const acc = event.accelerationIncludingGravity;
    if (!acc || acc.x === null) return;

    // Low-pass filter to isolate gravity per axis.
    this.gravity.x = this.filterAlpha * this.gravity.x + (1 - this.filterAlpha) * acc.x;
    this.gravity.y = this.filterAlpha * this.gravity.y + (1 - this.filterAlpha) * acc.y;
    this.gravity.z = this.filterAlpha * this.gravity.z + (1 - this.filterAlpha) * acc.z;

    // Subtracting gravity leaves the "movement" component.
    const dx = acc.x - this.gravity.x;
    const dy = acc.y - this.gravity.y;
    const dz = acc.z - this.gravity.z;
    const magnitude = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const now = Date.now();

    if (!this.overThreshold && magnitude > this.threshold) {
      this.overThreshold = true;
      if (now - this.lastStepAt > this.minStepIntervalMs) {
        this.lastStepAt = now;
        this.onStep();
      }
    } else if (this.overThreshold && magnitude < this.threshold * 0.6) {
      // Hysteresis: only "reset" once movement drops well below the
      // threshold, so a single step doesn't get counted twice on the way up.
      this.overThreshold = false;
    }
  }
}

window.StepCounter = StepCounter;
