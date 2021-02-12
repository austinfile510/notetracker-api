const knex = require('knex');
const app = require('../src/app');
const supertest = require('supertest');
const { expect } = require('chai');
const helpers = require('./test-helpers');

describe('Lists Endpoints', function () {
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

	// GET all lists
	describe(`GET /api/to-do-lists`, () => {
		const testUsers = helpers.makeUsersArray();

		beforeEach('insert users', () => {
			return db.into('nt_users').insert(testUsers);
		});

		context(`Given no lists`, () => {
			it(`responds with 200 and an empty list`, () => {
				return supertest(app)
					.get('/api/to-do-lists')
					.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
					.expect(200, []);
			});
		});

		context('Given there are lists in the database', () => {
			const testTasks = helpers.makeTasksArray();
			const testLists = helpers.makeListsArray();

			beforeEach('insert tasks', () => {
				return db
					.into('to_do_lists')
					.insert(testLists)
					.then(() => {
						return db.into('tasks').insert(testTasks);
					});
			});

			it('responds with 200 and all the lists', () => {
				return supertest(app)
					.get('/api/to-do-lists')
					.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
					.expect(200, testLists);
			});
		});
	});

	// GET list by id

	describe(`GET /api/to-do-lists/:list_id`, () => {
		context(`Given no lists`, () => {
			const testUsers = helpers.makeUsersArray();

			beforeEach('insert users', () => {
				return db.into('nt_users').insert(testUsers);
			});

			it(`responds with 404`, () => {
				const fakeListId = 123456;
				return supertest(app)
					.get(`/api/to-do-lists/${fakeListId}`)
					.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
					.expect(404, { error: { message: `List doesn't exist` } });
			});
		});

		context(`Given there are lists in the database`, () => {
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

			it(`responds with 200 and the specified list`, () => {
				const testUsers = helpers.makeUsersArray();
				const listId = 3;
				const expectedList = testLists[listId - 1];
				return supertest(app)
					.get(`/api/to-do-lists/${listId}`)
					.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
					.expect(200, expectedList);
			});
		});
	});

	// Delete list

	describe(`DELETE /api/to-do-lists/:list_id`, () => {
		context(`Given no lists`, () => {
			const testUsers = helpers.makeUsersArray();

			beforeEach('insert users', () => {
				return db.into('nt_users').insert(testUsers);
			});

			it(`responds with 404 when List doesn't exist`, () => {
				return supertest(app)
					.delete(`/api/to-do-lists/123`)
					.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
					.expect(404, {
						error: { message: `List doesn't exist` },
					});
			});
		});

		context(`Given there are lists in the database`, () => {
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
			it(`removes the list by ID from the database`, () => {
				const idToRemove = 2;
				const expectedList = testLists.filter((fr) => fr.id !== idToRemove);
				return supertest(app)
					.delete(`/api/to-do-lists/${idToRemove}`)
					.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
					.expect(204)
					.then(() =>
						supertest(app)
							.get(`/api/to-do-lists`)
							.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
							.expect(expectedList)
					);
			});
		});
	});

	// Insert list

	describe(`POST /api/to-do-lists`, () => {
		const testUsers = helpers.makeUsersArray();

		beforeEach('insert users', () => {
			return db.into('nt_users').insert(testUsers);
		});

		it(`adds a new list to the database`, () => {
			const newList = {
				list_name: 'test-name',
			};
			return supertest(app)
				.post(`/api/to-do-lists`)
				.send(newList)
				.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
				.expect(201)
				.expect((res) => {
					expect(res.body.list_name).to.eql(newList.list_name);
					expect(res.headers.location).to.eql(
						`/api/to-do-lists/${res.body.id}`
					);
				})
				.then((res) =>
					supertest(app)
						.get(`/api/to-do-lists/${res.body.id}`)
						.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
						.expect(res.body)
				);
		});

		const requiredFields = ['list_name'];

		requiredFields.forEach((field) => {
			const newList = {
				list_name: 'test-name',
			};

			it(`responds with 400 missing '${field}' if not supplied`, () => {
				delete newList[field];

				return supertest(app)
					.post(`/api/to-do-lists`)
					.send(newList)
					.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
					.expect(400, {
						error: { message: `'${field}' is required` },
					});
			});
		});
	});

	// Update list

	describe(`PATCH /api/to-do-lists`, () => {
		const testLists = helpers.makeListsArray();
		const testUsers = helpers.makeUsersArray();

		beforeEach('insert lists', () => {
			return db.into('nt_users').insert(testUsers);
		});
		context(`Given no lists`, () => {
			it(`responds with 404 when List doesn't exist`, () => {
				return supertest(app)
					.delete(`/api/to-do-lists/123`)
					.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
					.expect(404, {
						error: { message: `List doesn't exist` },
					});
			});
		});

		context(`Given there are lists in the database`, () => {
			const testLists = helpers.makeListsArray();

			beforeEach('insert lists', () => {
				return db.into('to_do_lists').insert(testLists);
			});

			it('responds with 204 and updates the list', () => {
				const idToUpdate = 2;
				const updateList = {
					list_name: 'updated list name',
				};
				const expectedList = {
					...testLists[idToUpdate - 1],
					...updateList,
				};
				return supertest(app)
					.patch(`/api/to-do-lists/${idToUpdate}`)
					.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
					.send(updateList)
					.expect(204)
					.then((res) => {
						supertest(app)
							.get(`/api/to-do-lists/${idToUpdate}`)
							.expect(expectedList);
					});
			});

			it(`responds with 400 when no required fields supplied`, () => {
				const idToUpdate = 2;
				return supertest(app)
					.patch(`/api/to-do-lists/${idToUpdate}`)
					.set('Authorization', helpers.makeAuthHeader(testUsers[1]))
					.send({ irrelevantField: 'foo' })
					.expect(400, {
						error: {
							message: `Request body must content 'list_name'`,
						},
					});
			});
		});
	});
});
