const knex = require('knex');
const { makeListsArray, makeMaliciousList } = require('./test-helpers');
const app = require('../src/app');
const { addColors } = require('winston/lib/winston/config');
const supertest = require('supertest');
const { expect } = require('chai');

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
	

	// Unauthorized Requests

	describe(`Unauthorized requests`, () => {
		const testLists = makeListsArray();

		beforeEach('insert lists', () => {
			return db.into('to_do_lists').insert(testLists);
		});

		it(`responds with 401 Unauthorized for GET /api/lists`, () => {
			return supertest(app)
				.get('/api/lists')
				.expect(401, { error: 'Unauthorized request' });
		});

		it(`responds with 401 Unauthorized for POST /api/lists`, () => {
			return supertest(app)
				.post('/api/lists')
				.send({ list_name: 'Something' })
				.expect(401, { error: 'Unauthorized request' });
		});

		it(`responds with 401 Unauthorized for GET /api/lists/:id`, () => {
			const secondList = testLists[1];
			return supertest(app)
				.get(`/api/lists/${secondList.id}`)
				.expect(401, { error: 'Unauthorized request' });
		});

		it(`responds with 401 Unauthorized for DELETE /api/lists/:id`, () => {
			const alist = testlists[1];
			return supertest(app)
				.delete(`/api/lists/${alist.id}`)
				.expect(401, { error: 'Unauthorized request' });
		});

		it(`responds with 401 Unauthorized for PATCH /api/lists/:id`, () => {
			const alist = testlists[1];
			return supertest(app)
				.patch(`/api/lists/${alist.id}`)
				.send({ title: 'updated-title' })
				.expect(401, { error: 'Unauthorized request' });
		});
	});

	// GET Requests

	// GET all lists
	describe(`GET /api/lists`, () => {
		context(`Given no lists`, () => {
			it(`responds with 200 and an empty list`, () => {
				return supertest(app)
					.get('/api/lists')
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(200, []);
			});
		});

		context('Given there are lists in the database', () => {
			const testLists = makeListsArray();

			beforeEach('insert lists', () => {
				return db.into('to_do_lists').insert(testLists);
			});

			it('responds with 200 and all the lists', () => {
				return supertest(app)
					.get('/api/lists')
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(200, testLists);
			});
		});

		context(`Given an XSS attack list`, () => {
			const { maliciousList, expectedList } = makeMaliciousList();

			beforeEach('insert malicious list', () => {
				return db.into('to_do_lists').insert([maliciousList]);
			});

			it('removes XSS attack content', () => {
				return supertest(app)
					.get(`/api/lists`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(200)
					.expect((res) => {
						expect(res.body[0].list_name).to.eql(expectedList.list_name);
					});
			});
		});
	});

	// GET list by id

	describe(`GET /api/lists/:list_id`, () => {
		context(`Given no lists`, () => {
			it(`responds with 404`, () => {
				const fakeListId = 123456;
				return supertest(app)
					.get(`/api/lists/${fakeListId}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(404, { error: { message: `list doesn't exist` } });
			});
		});

		context(`Given there are lists in the database`, () => {
			const testLists = makeListsArray();

			beforeEach('insert lists', () => {
				return db.into('to_do_lists').insert(testLists);
			});

			it(`responds with 200 and the specified list`, () => {
				const listId = 2;
				const expectedList = testLists[listId - 1];
				return supertest(app)
					.get(`/api/lists/${listId}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(200, expectedList);
			});
		});

		context(`Given an XSS attack list`, () => {
			const { maliciousList, expectedList } = makeMaliciousList();

			beforeEach('insert malicious list', () => {
				return db.into('to_do_lists').insert([maliciousList]);
			});

			it('removes XSS attack content', () => {
				return supertest(app)
					.get(`/api/lists`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(200)
					.expect((res) => {
						expect(res.body[0].list_name).to.eql(expectedList.list_name);
					});
			});
		});
	});

	// Delete list

	describe(`DELETE /api/lists:id`, () => {
		context(`Given no lists`, () => {
			it(`responds with 404 when list doesn't exist`, () => {
				return supertest(app)
					.delete(`/api/lists/123`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(404, {
						error: { message: `List doesn't exist` },
					});
			});
		});

		context(`Given there are lists in the database`, () => {
			const testLists = makeListsArray();

			beforeEach('insert lists', () => {
				return db.into('to_do_lists').insert(testLists);
			});

			it(`removes the list by ID from the database`, () => {
				const idToRemove = 2;
				const expectedList = testLists.filter((fr) => fr.id !== idToRemove);
				return supertest(app)
					.delete(`/api/lists/${idToRemove}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(204)
					.then(() =>
						supertest(app)
							.get(`/api/lists`)
							.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
							.expect(expectedList)
					);
			});
		});
	});

	// Insert list

	describe(`POST /api/lists`, () => {
		const testLists = makeListsArray();
		beforeEach('insert lists', () => {
			// return db.into('to_do_lists').insert(testLists);
		});

		it(`adds a new list to the database`, () => {
			const newList = {
				list_name: 'test-name',
			};
			return supertest(app)
				.post(`/api/lists`)
				.send(newList)
				.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
				.expect(201)
				.expect((res) => {
					expect(res.body.list_name).to.eql(newList.list_name);
					expect(res.headers.location).to.eql(`/api/lists/${res.body.id}`);
				})
				.then((res) =>
					supertest(app)
						.get(`/api/lists/${res.body.id}`)
						.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
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
					.post(`/api/lists`)
					.send(newList)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(400, {
						error: { message: `'${field}' is required` },
					});
			});
		});

		it('removes XSS attack content from response', () => {
			const { maliciousList, expectedList } = makeMaliciousList();
			return supertest(app)
				.post(`/api/lists`)
				.send(maliciousList)
				.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
				.expect(201)
				.expect((res) => {
					expect(res.body.list_name).to.eql(expectedList.list_name);
				});
		});
	});

	// Update list

	describe(`PATCH /api/lists`, () => {
		context(`Given no lists`, () => {
			it(`responds with 404 when list doesn't exist`, () => {
				return supertest(app)
					.delete(`/api/lists/123`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(404, {
						error: { message: `list doesn't exist` },
					});
			});
		});

		context(`Given there are lists in the database`, () => {
			const testLists = makeListsArray();

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
					.patch(`/api/lists/${idToUpdate}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.send(updateList)
					.expect(204)
					.then((res) => {
						supertest(app)
							.get(`/api/lists/${idToUpdate}`)
							.expect(expectedList);
					});
			});

			it(`responds with 400 when no required fields supplied`, () => {
				const idToUpdate = 2;
				return supertest(app)
					.patch(`/api/lists/${idToUpdate}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
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
