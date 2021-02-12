const bcrypt = require('bcryptjs');
const xss = require('xss');
const knex = require('knex');

const REGEX_UPPER_LOWER_NUMBER_SPECIAL = /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&])[\S]+/;

const UsersService = {
	getUserById(knex, id) {
		return knex.from('rk_users').select('*').where('id', id).first();
	},

	hasUserWithUserName(db, user_name, email) {
		return db('rk_users')
			.where({ user_name })
			.orWhere({ email })
			.first()
			.then((user) => !!user);
	},
	insertUser(db, newUser) {
		return db
			.insert(newUser)
			.into('rk_users')
			.returning('*')
			.then(([user]) => user);
	},
	validatePassword(password) {
		if (password.length < 8) {
			return 'Password be longer than 8 characters';
		}
		if (password.length > 72) {
			return 'Password be less than 72 characters';
		}
		if (password.startsWith(' ') || password.endsWith(' ')) {
			return 'Password must not start or end with empty spaces';
		}
		if (!REGEX_UPPER_LOWER_NUMBER_SPECIAL.test(password)) {
			return 'Password must contain one upper case, lower case, number and special character';
		}
		return null;
	},
	hashPassword(password) {
		return bcrypt.hash(password, 12);
	},
	serializeUser(user) {
		return {
			id: user.id,
			full_name: xss(user.full_name),
			user_name: xss(user.user_name),
			email: xss(user.email),
			date_created: new Date(user.date_created),
		};
	},
};

module.exports = UsersService;
