require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const { NODE_ENV, API_ENDPOINT, CORS_METHODS } = require('./config');
const errorHandler = require('./error-handler');
const authRouter = require('./auth/auth-router');
const usersRouter = require('./users/users-router');
const listsRouter = require('./to-do-lists/to-do-lists-router');


const app = express();

const morganOption = NODE_ENV === 'production' ? 'tiny' : 'common';

app.use(morgan(morganOption));
app.use(helmet());
app.use(
	cors({
		origin: API_ENDPOINT,
		methods: CORS_METHODS,
	})
);

app.use('/to-do-lists', listsRouter);

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

app.get('/', (req, res) => {
	res.send('Hello, world!');
});

app.use(errorHandler);

module.exports = app;
