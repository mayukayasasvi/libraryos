const router = require("express").Router();
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const db = require("../database");

const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
router.post("/login", loginLimit, (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }
  const user = db.prepare("SELECT id, username, password_hash, role FROM users WHERE username = ?").get(username.trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid username or password." });
  }
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: "Could not start session." });
    req.session.user = { id: user.id, username: user.username, role: user.role };
    res.json({ user: req.session.user });
  });
});
router.post("/logout", (req, res) => req.session.destroy(() => {
  res.clearCookie("library.sid");
  res.json({ ok: true });
}));
router.get("/me", (req, res) => res.json({ user: req.session.user || null }));
module.exports = router;
