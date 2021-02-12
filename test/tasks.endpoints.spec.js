const knex = require('knex');
const app = require('../src/app');
const helpers = require('./test-helpers');
const supertest = require('supertest');
const { expect } = require('chai');

describe('Tasks Endpoints', function () {
	let db;

	before('make knex instance', () => {
		db = knex({
			client: 'pg',
			connection: process.env.TEST_DATABASE_URL,
		});
		app.set('db', db);
	});

	after('disconnect from db', () => db.destroy());

	before('cleanup', () => helpers.cleanTables(db));

	afterEach('cleanup', () => helpers.cleanTables(db));

	// GET Requests

	// GET all tasks
	describe(`GET /api/tasks`, () => {
		context(`Given no tasks`, () => {
			const testUsers = helpers.makeUsersArray();

			beforeEach('insert users', () => {
				return db.into('nt_users').insert(testUsers);
			});

			it(`responds with 200 and an empty list`, () => {
				return supertest(app)
					.get('/api/tasks')
					.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
					.expect(200, []);
			});
		});

		context('Given there are tasks in the database', () => {
			const testTasks = helpers.makeTasksArray();
			const testLists = helpers.makeListsArray();
			const testUsers = helpers.makeUsersArray();

			beforeEach('insert tasks', () => {
				return db
					.into('nt_users')
					.insert(testUsers)
					.then(() => {
						return db
							.into('to_do_lists')
							.insert(testLists)
							.then(() => {
								return db.into('tasks').insert(testTasks);
							});
					});
			});

			it('responds with 200 and all the tasks', () => {
				return supertest(app)
					.get('/api/tasks')
					.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
					.expect(200, testTasks);
			});
		});
	});

	// GET task by id

	describe(`GET /api/tasks/:task_id`, () => {
		context(`Given no tasks`, () => {
			const testUsers = helpers.makeUsersArray();

			beforeEach('insert users', () => {
				return db.into('nt_users').insert(testUsers);
			});

			it(`responds with 404`, () => {
				const fakeTaskId = 123456;
				return supertest(app)
					.get(`/api/tasks/${fakeTaskId}`)
					.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
					.expect(404, { error: { message: `Task doesn't exist` } });
			});
		});

		context(`Given there are tasks in the database`, () => {
			const testTasks = helpers.makeTasksArray();
			const testLists = helpers.makeListsArray();
			const testUsers = helpers.makeUsersArray();

			beforeEach('insert tasks', () => {
				return db
					.into('nt_users')
					.insert(testUsers)
					.then(() => {
						return db
							.into('to_do_lists')
							.insert(testLists)
							.then(() => {
								return db.into('tasks').insert(testTasks);
							});
					});
			});

			it(`responds with 200 and the specified task`, () => {
				const taskId = 2;
				const expectedTask = testTasks[taskId - 1];
				return supertest(app)
					.get(`/api/tasks/${taskId}`)
					.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
					.expect(200, expectedTask);
			});
		});
	});

	// Delete task

	describe(`DELETE /api/tasks:id`, () => {
		context(`Given no tasks`, () => {
			const testUsers = helpers.makeUsersArray();

			beforeEach('insert users', () => {
				return db.into('nt_users').insert(testUsers);
			});

			it(`responds with 404 when task doesn't exist`, () => {
				return supertest(app)
					.delete(`/api/tasks/123`)
					.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
					.expect(404, {
						error: { message: `Task doesn't exist` },
					});
			});
		});

		context(`Given there are tasks in the database`, () => {
			const testTasks = helpers.makeTasksArray();
			const testLists = helpers.makeListsArray();
			const testUsers = helpers.makeUsersArray();

			beforeEach('insert tasks', () => {
				return db
					.into('nt_users')
					.insert(testUsers)
					.then(() => {
						return db
							.into('to_do_lists')
							.insert(testLists)
							.then(() => {
								return db.into('tasks').insert(testTasks);
							});
					});
			});

			it(`removes the task by ID from the database`, () => {
				const testUser = helpers.makeUsersArray()[1];
				const idToRemove = 2;
				const expectedTask = testTasks.filter((fr) => fr.id !== idToRemove);
				return supertest(app)
					.delete(`/api/tasks/${idToRemove}`)
					.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
					.expect(204)
					.then(() =>
						supertest(app)
							.get(`/api/tasks`)
							.set('Authorization', helpers.makeAuthHeader(testUser))
							.expect(expectedTask)
					);
			});
		});
	});

	// Insert task

	describe(`POST /api/tasks`, () => {
		const testUsers = helpers.makeUsersArray();
		const testLists = helpers.makeListsArray();

		beforeEach('insert lists', () => {
			return db
				.into('nt_users')
				.insert(testUsers)
				.then(() => {
					return db.into('to_do_lists').insert(testLists);
				});
		});

		it(`adds a new task to the database`, () => {
			const newTask = {
				title: 'Something',
				content: 'Test new task content',
				is_checked: false,
				modified: new Intl.DateTimeFormat('en-US').format(new Date()),
				list_id: 1,
				user_id: 2,
			};
			return supertest(app)
				.post(`/api/tasks`)
				.send(newTask)
				.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
				.expect(201)
				.expect((res) => {
					expect(res.body.title).to.eql(newTask.title);
					expect(res.body.content).to.eql(newTask.content);
					expect(res.body.is_checked).to.eql(newTask.is_checked);
					expect(res.body.user_id).to.eql(newTask.user_id);
					expect(res.headers.location).to.eql(`/api/tasks/${res.body.id}`);
					const expected = new Intl.DateTimeFormat('en-US').format(new Date());
					const actual = new Intl.DateTimeFormat('en-US').format(
						new Date(res.body.modified)
					);
					expect(actual).to.eql(expected);
				})
				.then((res) =>
					supertest(app)
						.get(`/api/tasks/${res.body.id}`)
						.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
						.expect(res.body)
				);
		});

		const requiredFields = ['title', 'content', 'list_id'];

		requiredFields.forEach((field) => {
			const newTask = {
				title: 'test-name',
				content: 'Add new content',
				list_id: 1,
				user_id: 1,
			};

			it(`responds with 400 missing '${field}' if not supplied`, () => {
				const testUser = testUsers[1];
				delete newTask[field];

				return supertest(app)
					.post(`/api/tasks`)
					.send(newTask)
					.set('Authorization', helpers.makeAuthHeader(testUser))
					.expect(400, {
						error: { message: `'${field}' is required` },
					});
			});
		});
	});

	// Update task

	describe(`PATCH /api/tasks`, () => {
		const testLists = helpers.makeListsArray();
		const testUsers = helpers.makeUsersArray();

		beforeEach('insert lists', () => {
			return db
				.into('nt_users')
				.insert(testUsers)
				.then(() => {
					return db.into('to_do_lists').insert(testLists);
				});
		});
		context(`Given no tasks`, () => {
			it(`responds with 404 when task doesn't exist`, () => {
				return supertest(app)
					.delete(`/api/tasks/123`)
					.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
					.expect(404, {
						error: { message: `Task doesn't exist` },
					});
			});
		});

		context(`Given there are tasks in the database`, () => {
			const testTasks = helpers.makeTasksArray();

			beforeEach('insert tasks', () => {
				return db.into('tasks').insert(testTasks);
			});

			it('responds with 204 and updates the task', () => {
				const idToUpdate = 2;
				const updateTask = {
					title: 'updated-title',
					content: 'Updated task',
					list_id: 1,
				};
				const expectedTask = {
					...testTasks[idToUpdate - 1],
					...updateTask,
				};
				return supertest(app)
					.patch(`/api/tasks/${idToUpdate}`)
					.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
					.send(updateTask)
					.expect(204)
					.then((res) => {
						return supertest(app)
							.get(`/api/tasks/${idToUpdate}`)
							.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
							.expect(expectedTask);
					});
			});

			it(`responds with 400 when no required fields supplied`, () => {
				const idToUpdate = 2;
				return supertest(app)
					.patch(`/api/tasks/${idToUpdate}`)
					.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
					.send({ irrelevantField: 'foo' })
					.expect(400, {
						error: {
							message: `Request body must content either 'title', 'content' or 'list_id'`,
						},
					});
			});

			it(`responds with 204 when updating only a subset of fields`, () => {
				const idToUpdate = 2;
				const updateTask = {
					title: 'updated task title',
				};
				const expectedTask = {
					...testTasks[idToUpdate - 1],
					...updateTask,
				};

				return supertest(app)
					.patch(`/api/tasks/${idToUpdate}`)
					.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
					.send({
						...updateTask,
						fieldToIgnore: 'should not be in GET response',
					})
					.expect(204)
					.then((res) =>
						supertest(app)
							.get(`/api/tasks/${idToUpdate}`)
							.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
							.expect(expectedTask)
					);
			});
		});
	});
});
