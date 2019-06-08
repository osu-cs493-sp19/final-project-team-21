const router = require('express').Router();

router.use('/courses', require('./courses'));
router.use('/assignments', require('./assignments'));
router.use('/users', require('./users'));

module.exports = router;
