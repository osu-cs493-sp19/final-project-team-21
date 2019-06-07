const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');

const api = require('./api');
const { connectToDB } = require('./lib/mongo');

const app = express();
const port = process.env.PORT || 8000;

app.use(morgan('dev'));

app.use(bodyParser.json());
app.use(express.static('public'));

app.use('/', api);

app.use('*', (req, res) => {
  res.status(404).json({
    error: `Requested resource ${req.originalUrl} does not exist`,
  });
});

connectToDB(async () => {
  try {
    app.listen(port, () => {
      console.log(`== Server is running on port ${port}`);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});
