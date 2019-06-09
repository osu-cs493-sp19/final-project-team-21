const router = require('express').Router();

const { getDownloadStreamById } = require('../models/assignment');

router.use('/courses', require('./courses'));
router.use('/assignments', require('./assignments'));
router.use('/users', require('./users'));

router.get('/media/submissions/:id', async (req, res, next) => {
  try {
    const stream = await getDownloadStreamById(req.params.id);
    if (stream) {
      stream.on('error', (err) => {
        if (err.code === 'ENOENT') {
          console.error(err);
          next();
        } else {
          next(err);
        }
      })
        .on('file', (file) => {
          res.status(200).type(file.metadata.contentType);
        })
        .pipe(res);
    } else {
      next();
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving file. Try again later.');
  }
});

module.exports = router;
