const router = require('express').Router();

router.use('/courses', require('./courses'));
router.use('/assignments', require('./assignments'));

module.exports = router;
