module.exports = {
	PORT: process.env.PORT || 8000,
	NODE_ENV: process.env.NODE_ENV || 'development',
	API_ENDPOINT: process.env.REACT_APP_API_ENDPOINT || 'http://localhost:3000',
	DATABASE_URL:
		process.env.DATABASE_URL ||
		'postgresql://dunder_mifflin:interactive@localhost/recipe-keeper',
	CORS_METHODS: process.env.REACT_APP_CORS_METHODS || '*',
	TEST_DATABASE_URL:
		process.env.DATABASE_URL ||
		'postgresql://dunder_mifflin:interactive@localhost/recipe-keeper-test',
	JWT_SECRET: process.env.JWT_SECRET || 'change-this-secret',
	JWT_EXPIRY: process.env.JWT_EXPIRY || '1d',
};
