const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    walletAddress: { type: String, default: null }, // optional, for later
    avatarPath: { type: String, default: null },

    // Google Health API (covers Fitbit + Pixel Watch + other Google-linked
    // devices — this replaced the old Google Fit / Fitbit Web APIs in 2026).
    googleHealth: {
      accessToken: { type: String, default: null },
      refreshToken: { type: String, default: null },
      expiresAt: { type: Date, default: null },      // when accessToken expires
      connectedAt: { type: Date, default: null }
    },

    // Apple Health has no public web API — the only way a website can get
    // steps out of it is a webhook bridge (e.g. the "Health Auto Export" iOS
    // app) pushing data to a per-user URL. This token authenticates that URL.
    appleWebhookToken: { type: String, default: null, unique: true, sparse: true }
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
