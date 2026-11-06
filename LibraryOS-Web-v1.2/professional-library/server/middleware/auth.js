function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Please sign in." });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Administrator permission required." });
  }
  next();
}
module.exports = { requireAuth, requireAdmin };
