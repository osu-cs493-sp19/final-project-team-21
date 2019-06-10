const jwt = require('jsonwebtoken');

const secretKey = process.env.JWT_SECRET;

const generateAuthToken = (id, role) => {
  const payload = {
    sub: id,
    role,
  };
  const token = jwt.sign(payload, secretKey, { expiresIn: '24h' });
  return token;
};

const requireAuthentication = (req, res, next) => {
  const authHeader = req.get('Authorization') || '';
  const authHeaderParts = authHeader.split(' ');
  const token = authHeaderParts[0] === 'Bearer' ? authHeaderParts[1] : null;

  try {
    const payload = jwt.verify(token, secretKey);
    req.user = {
      id: payload.sub,
      role: payload.role,
    };
    next();
  } catch (err) {
    res.status(401).send({ error: 'Invalid authentication token provided.' });
  }
};

const optionalAuthentication = (req, res, next) => {
  const authHeader = req.get('Authorization') || '';
  const authHeaderParts = authHeader.split(' ');
  const token = authHeaderParts[0] === 'Bearer' ? authHeaderParts[1] : null;

  try {
    const payload = jwt.verify(token, secretKey);
    req.user = {
      id: payload.sub,
      role: payload.role,
    };
    next();
  } catch (err) {
    next();
  }
};

module.exports = { generateAuthToken, requireAuthentication, optionalAuthentication };
