const jwt = require('jsonwebtoken');

function userMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    // Token is missing, user is not authenticated
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const decodedToken = jwt.verify(token, 'your-secret-key');

    if (Date.now() >= decodedToken.exp * 1000) {
      return res.status(401).json({ message: 'Token has expired' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports={userMiddleware}