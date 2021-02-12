const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function makeUsersArray() {
	return [
		{
			id: 1,
			user_name: 'test-user-1',
			full_name: 'Test user 1',
			password: 'password',
			email: 'email1@gmail.com',
			date_created: '2021-02-01T07:28:20.717Z',
		},
		{
			id: 2,
			user_name: 'test-user-2',
			full_name: 'Test user 2',
			password: 'password',
			email: 'email2@gmail.com',
			date_created: '2021-02-01T07:28:20.717Z',
		},
		{
			id: 3,
			user_name: 'test-user-3',
			full_name: 'Test user 3',
			password: 'password',
			email: 'email3@gmail.com',
			date_created: '2021-02-01T07:28:20.717Z',
		},
		{
			id: 4,
			user_name: 'test-user-4',
			full_name: 'Test user 4',
			password: 'password',
			email: 'email4@gmail.com',
			date_created: '2021-02-01T07:28:20.717Z',
		},
	];
}

function makeTasksArray() {
	return [
		{
			id: 1,
			title: 'Walk the dog',
			content:
				'Corporis accusamus placeat quas non voluptas. Harum fugit molestias qui. Velit ex animi reiciendis quasi. Suscipit totam delectus ut voluptas aut qui rerum. Non veniam eius molestiae rerum quam.\n \rUnde qui aperiam praesentium alias. Aut temporibus id quidem recusandae voluptatem ut eum. Consequatur asperiores et in quisquam corporis maxime dolorem soluta. Et officiis id est quia sunt qui iste reiciendis saepe. Ut aut doloribus minus non nisi vel corporis. Veritatis mollitia et molestias voluptas neque aspernatur reprehenderit.\n \rMaxime aut reprehenderit mollitia quia eos sit fugiat exercitationem. Minima dolore soluta. Quidem fuga ut sit voluptas nihil sunt aliquam dignissimos. Ex autem nemo quisquam voluptas consequuntur et necessitatibus minima velit. Consequatur quia quis tempora minima. Aut qui dolor et dignissimos ut repellat quas ad.',
			is_checked: false,
			modified: '2021-01-17T23:20:18.000Z',
			list_id: 1,
		},
		{
			id: 2,
			title: 'Pick up dry-cleaning',
			content:
				'Eos laudantium quia ab blanditiis temporibus necessitatibus. Culpa et voluptas ut sed commodi. Est qui ducimus id. Beatae sint aspernatur error ullam quae illum sint eum. Voluptas corrupti praesentium soluta cumque illo impedit vero omnis nisi.\n \rNam sunt reprehenderit soluta quis explicabo impedit id. Repudiandae eligendi libero ad ut dolores. Laborum nihil sint et labore iusto reiciendis cum. Repellat quos recusandae natus nobis ullam autem veniam id.\n \rEsse blanditiis neque tempore ex voluptate commodi nemo. Velit sapiente at placeat eveniet ut rem. Quidem harum ut dignissimos. Omnis pariatur quas aperiam. Quasi voluptas qui nulla. Iure quas veniam aut quia et.',
			is_checked: false,
			modified: '2021-01-17T23:20:18.000Z',
			list_id: 2,
		},
		{
			id: 3,
			title: 'Take out the garbage',
			content:
				'Occaecati dignissimos quam qui facere deserunt quia. Quaerat aut eos laudantium dolor odio officiis illum. Velit vel qui dolorem et.\n \rQui ut vel excepturi in at. Ut accusamus cumque quia sapiente ut ipsa nesciunt. Dolorum quod eligendi qui aliquid sint.\n \rAt id deserunt voluptatem et rerum. Voluptatem fuga tempora aut dignissimos est odio maiores illo. Fugiat in ad expedita voluptas voluptatum nihil.',
			is_checked: true,
			modified: '2021-01-17T23:20:18.000Z',
			list_id: 3,
		},
	];
}

function makeMaliciousTask() {
	const maliciousTask = {
		id: 911,
		title: 'Naughty naughty very naughty <script>alert("xss");</script>',
		content: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
		is_checked: true,
		modified: new Date().toISOString(),
		list_id: 1,
	};
	const expectedTask = {
		...maliciousTask,
		title:
			'Naughty naughty very naughty &lt;script&gt;alert("xss");&lt;/script&gt;',
		content: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`,
	};
	return {
		maliciousTask,
		expectedTask,
	};
}

function makeListsArray() {
	return [
		{
			id: 1,
			list_name: 'Important',
			user_id: 1,
		},
		{
			id: 2,
			list_name: 'Work',
			user_id: 1,
		},
		{
			id: 3,
			list_name: 'Grocery List',
			user_id: 1,
		},
	];
}

function makeExpectedList(list) {
	return {
		id: list.id,
		list_name: list.list_name,
		date_modified: list.date_modified.toISOString(),
		user_id: list.user_id,
	};
}

function makeMaliciousList() {
	const maliciousList = {
		id: 911,
		list_name: 'Naughty naughty very naughty <script>alert("xss");</script>',
	};
	const expectedList = {
		...maliciousList,
		list_name:
			'Naughty naughty very naughty &lt;script&gt;alert("xss");&lt;/script&gt;',
	};
	return {
		maliciousList,
		expectedList,
	};
}

function makeTestsFixtures() {
	const testUsers = makeUsersArray();
	const testTasks = makeTasksArray(testUsers);
	return { testUsers, testTasks };
}

function cleanTables(db) {
	return db.transaction((trx) =>
		trx
			.raw(
				`TRUNCATE
        tasks,
		to_do_lists,
        nt_users
      `
			)
			.then(() =>
				Promise.all([
					trx.raw(`ALTER SEQUENCE tasks_id_seq minvalue 0 START WITH 1`),
					trx.raw(`ALTER SEQUENCE to_do_lists_id_seq minvalue 0 START WITH 1`),
					trx.raw(`ALTER SEQUENCE nt_users_id_seq minvalue 0 START WITH 1`),
					trx.raw(`SELECT setval('tasks_id_seq', 0)`),
					trx.raw(`SELECT setval('to_do_lists_id_seq', 0)`),
					trx.raw(`SELECT setval('nt_users_id_seq', 0)`),
				])
			)
	);
}

function seedUsers(db, users) {
	const preppedUsers = users.map((user) => ({
		...user,
		password: bcrypt.hashSync(user.password, 1),
	}));
	return db
		.into('nt_users')
		.insert(preppedUsers)
		.then(() =>
			// update the auto sequence to stay in sync
			db.raw(`SELECT setval('nt_users_id_seq', ?)`, [users.length - 1])
		);
}

function seedMaliciousTask(db, user, task) {
	return seedUsers(db, [user]).then(() => db.into('tasks').insert([task]));
}

function makeAuthHeader(user, secret = process.env.JWT_SECRET) {
	const token = jwt.sign({ user_id: user.id }, secret, {
		subject: user.user_name,
		algorithm: 'HS256',
	});
	return `Bearer ${token}`;
}

module.exports = {
	makeUsersArray,
	makeTasksArray,
	makeMaliciousTask,
	makeListsArray,
	makeMaliciousList,
	makeExpectedList,
	makeMaliciousTask,

	seedMaliciousTask,
	cleanTables,
	makeAuthHeader,
	seedUsers,
	makeTestsFixtures,
};
