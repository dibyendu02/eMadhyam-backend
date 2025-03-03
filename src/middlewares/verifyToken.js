const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.token;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json("Token is not valid");
      req.user = user;
      return next();
    });
  } else {
    return res.status(401).json("you're not authenticated");
  }
};

const verifyTokenandAuthorization = (req, res, next) => {
  verifyToken(req, res, () => {
    console.log(req.user.id, req.params.id);
    if (req.user.id === req.params.id || req.user.isAdmin) {
      next();
    } else {
      res.status(403).json("You're not allowed to do that");
    }
  });
};

const verifyTokenandAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.isAdmin) {
      next();
    } else {
      res.status(403).json("You're not allowed to do that");
    }
  });
};

module.exports = {
  verifyToken,
  verifyTokenandAuthorization,
  verifyTokenandAdmin,
};
