const express = require('express');
const path = require('path');
const { requireAuth } = require('../middleware/jwt-auth');
const UsersService = require('./users-service');

const usersRouter = express.Router();
const jsonBodyParser = express.json();

// User Route (Registration)

usersRouter.post('/', jsonBodyParser, (req, res, next) => {
	const { password, user_name, full_name, email } = req.body;

	for (const field of ['full_name', 'user_name', 'password', 'email'])
		if (!req.body[field])
			return res.status(400).json({
				error: `Missing '${field}' in request body`,
			});

	const passwordError = UsersService.validatePassword(password);

	if (passwordError) return res.status(400).json({ error: passwordError });

	UsersService.hasUserWithUserName(req.app.get('db'), user_name, email)
		.then((hasUserWithUserName) => {
			if (hasUserWithUserName)
				return res.status(400).json({ error: `Username or email already taken` });

			return UsersService.hashPassword(password).then((hashedPassword) => {
				const newUser = {
					user_name,
					password: hashedPassword,
					full_name,
					email,
					date_created: 'now()',
				};

				return UsersService.insertUser(req.app.get('db'), newUser).then(
					(user) => {
						res
							.status(201)
							.location(path.posix.join(req.originalUrl, `/${user.id}`))
							.json(UsersService.serializeUser(user));
					}
				);
			});
		})
		.catch(next);
});

// User ID Route

usersRouter
	.route('/:user_id')
	.all((req, res, next) => {
		const knexInstance = req.app.get('db');
		UsersService.getUserById(knexInstance, req.params.user_id)
			.then((user) => {
				if (!user) {
					return res.status(404).json({
						error: { message: `User doesn't exist` },
					});
				}
				res.user = user;
				next();
			})
			.catch(next);
	})

	.get((req, res) => {
		res.json(UsersService.serializeUser(res.user));
	});

module.exports = usersRouter;
