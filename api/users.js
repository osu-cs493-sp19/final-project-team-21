const router = require('express').Router();

const {
  generateAuthToken,
  requireAuthentication,
  optionalAuthentication,
} = require('../lib/auth');
const { validateAgainstSchema } = require('../lib/validation');
const {
  UserSchema,
  insertNewUser,
  getUserDetailsById,
  validateUser,
} = require('../models/user');

router.post('/', optionalAuthentication, async (req, res) => {
  const validRoles = ['admin', 'instructor', 'student'];
  if (validateAgainstSchema(req.body, UserSchema) && validRoles.includes(req.body.role)) {
    if (req.body.role === 'student' || (req.user && req.user.role === 'admin')) {
      try {
        const id = await insertNewUser(req.body);
        res.status(201).send({ id });
      } catch (err) {
        console.error(err);
        res.status(500).send({
          error: 'Error inserting user into DB. Please try again later.',
        });
      }
    } else {
      res.status(403).send({
        error: 'Unauthorized to create user.',
      });
    }
  } else {
    res.status(400).send({
      error: 'Request body is not a valid user object.',
    });
  }
});

router.post('/login', async (req, res) => {
  if (req.body && req.body.email && req.body.password) {
    try {
      const validated = await validateUser(req.body.email, req.body.password);
      if (validated) {
        const token = generateAuthToken(validated.id, validated.role);
        res.status(200).send({ token });
      } else {
        res.status(401).send({
          error: 'Invalid credentials',
        });
      }
    } catch (err) {
      console.error(err);
      res.status(500).send({
        error: 'Error validating user. Try again later.',
      });
    }
  } else {
    res.status(400).send({
      error: 'Request body was invalid',
    });
  }
});

router.get('/:id', requireAuthentication, async (req, res, next) => {
  if (req.params.id === req.user.id) {
    try {
      const user = await getUserDetailsById(req.params.id);
      if (user) {
        delete user.password;
        res.status(200).send(user);
      } else {
        next();
      }
    } catch (err) {
      console.error(err);
      res.status(500).send({
        error: 'Unable to fetch user. Please try again later.',
      });
    }
  } else {
    res.status(403).send({
      error: 'Unauthorized to access the specified resource',
    });
  }
});

module.exports = router;
