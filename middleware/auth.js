const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: true, message: "Unauthenticated" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const token_decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    req.userId = token_decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: true, message: "Invalid token" });
  }
};

module.exports = authMiddleware;
