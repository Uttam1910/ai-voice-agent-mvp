require('dotenv').config(); 
const express = require('express');
const bodyParser = require('body-parser');
const callsRouter = require('./routes/calls');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// health
app.get('/', (req, res) => res.send('AI Voice MVP running'));

// calls
app.use('/calls', callsRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
