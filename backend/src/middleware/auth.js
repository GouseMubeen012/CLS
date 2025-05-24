const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured!');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Authentication temporarily unavailable'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            error: 'Token expired',
            message: 'Please login again'
          });
        }
        
        if (err.name === 'JsonWebTokenError') {
          return res.status(403).json({
            error: 'Invalid token',
            message: 'Token validation failed'
          });
        }

        console.error('Token verification error:', err);
        return res.status(403).json({
          error: 'Authentication failed',
          message: 'Please try again'
        });
      }
      
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'An unexpected error occurred'
    });
  }
};

const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

module.exports = { 
  authenticateToken,
  checkRole
};

