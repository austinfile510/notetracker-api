const knex = require('knex');
const { makeFoldersArray, makeMaliciousFolder } = require('./folders-fixtures');
const app = require('../src/app');
const { addColors } = require('winston/lib/winston/config');
const supertest = require('supertest');
const { expect } = require('chai');

describe('Folders Endpoints', function () {
	let db;

	before('make knex instance', () => {
		db = knex({
			client: 'pg',
			connection: process.env.TEST_DATABASE_URL,
		});
		app.set('db', db);
	});

	after('disconnect from db', () => db.destroy());

	before('clean the table', () =>
		db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE')
	);

	afterEach('cleanup', () =>
		db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE')
	);

	// Unauthorized Requests

	describe(`Unauthorized requests`, () => {
		const testFolders = makeFoldersArray();

		beforeEach('insert folders', () => {
			return db.into('folders').insert(testFolders);
		});

		it(`responds with 401 Unauthorized for GET /api/folders`, () => {
			return supertest(app)
				.get('/api/folders')
				.expect(401, { error: 'Unauthorized request' });
		});

		it(`responds with 401 Unauthorized for POST /api/folders`, () => {
			return supertest(app)
				.post('/api/folders')
				.send({ folder_name: 'Something' })
				.expect(401, { error: 'Unauthorized request' });
		});

		it(`responds with 401 Unauthorized for GET /api/folders/:id`, () => {
			const secondFolder = testFolders[1];
			return supertest(app)
				.get(`/api/folders/${secondFolder.id}`)
				.expect(401, { error: 'Unauthorized request' });
		});

		it(`responds with 401 Unauthorized for DELETE /api/folders/:id`, () => {
			const aFolder = testFolders[1];
			return supertest(app)
				.delete(`/api/folders/${aFolder.id}`)
				.expect(401, { error: 'Unauthorized request' });
		});

		it(`responds with 401 Unauthorized for PATCH /api/folders/:id`, () => {
			const aFolder = testFolders[1];
			return supertest(app)
				.patch(`/api/folders/${aFolder.id}`)
				.send({ title: 'updated-title' })
				.expect(401, { error: 'Unauthorized request' });
		});
	});

	// GET Requests

	// GET all folders
	describe(`GET /api/folders`, () => {
		context(`Given no folders`, () => {
			it(`responds with 200 and an empty list`, () => {
				return supertest(app)
					.get('/api/folders')
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(200, []);
			});
		});

		context('Given there are folders in the database', () => {
			const testFolders = makeFoldersArray();

			beforeEach('insert folders', () => {
				return db.into('folders').insert(testFolders);
			});

			it('responds with 200 and all the folders', () => {
				return supertest(app)
					.get('/api/folders')
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(200, testFolders);
			});
		});

		context(`Given an XSS attack folder`, () => {
			const { maliciousFolder, expectedFolder } = makeMaliciousFolder();

			beforeEach('insert malicious folder', () => {
				return db.into('folders').insert([maliciousFolder]);
			});

			it('removes XSS attack content', () => {
				return supertest(app)
					.get(`/api/folders`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(200)
					.expect((res) => {
						expect(res.body[0].folder_name).to.eql(expectedFolder.folder_name);
					});
			});
		});
	});

	// GET folder by id

	describe(`GET /api/folders/:folder_id`, () => {
		context(`Given no folders`, () => {
			it(`responds with 404`, () => {
				const fakeFolderId = 123456;
				return supertest(app)
					.get(`/api/folders/${fakeFolderId}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(404, { error: { message: `Folder doesn't exist` } });
			});
		});

		context(`Given there are folders in the database`, () => {
			const testFolders = makeFoldersArray();

			beforeEach('insert folders', () => {
				return db.into('folders').insert(testFolders);
			});

			it(`responds with 200 and the specified folder`, () => {
				const folderId = 2;
				const expectedFolder = testFolders[folderId - 1];
				return supertest(app)
					.get(`/api/folders/${folderId}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(200, expectedFolder);
			});
		});

		context(`Given an XSS attack folder`, () => {
			const { maliciousFolder, expectedFolder } = makeMaliciousFolder();

			beforeEach('insert malicious folder', () => {
				return db.into('folders').insert([maliciousFolder]);
			});

			it('removes XSS attack content', () => {
				return supertest(app)
					.get(`/api/folders`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(200)
					.expect((res) => {
						expect(res.body[0].folder_name).to.eql(expectedFolder.folder_name);
					});
			});
		});
	});

	// Delete Folder

	describe(`DELETE /api/folders:id`, () => {
		context(`Given no folders`, () => {
			it(`responds with 404 when folder doesn't exist`, () => {
				return supertest(app)
					.delete(`/api/folders/123`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(404, {
						error: { message: `Folder doesn't exist` },
					});
			});
		});

		context(`Given there are folders in the database`, () => {
			const testFolders = makeFoldersArray();

			beforeEach('insert folders', () => {
				return db.into('folders').insert(testFolders);
			});

			it(`removes the folder by ID from the database`, () => {
				const idToRemove = 2;
				const expectedFolder = testFolders.filter((fr) => fr.id !== idToRemove);
				return supertest(app)
					.delete(`/api/folders/${idToRemove}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(204)
					.then(() =>
						supertest(app)
							.get(`/api/folders`)
							.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
							.expect(expectedFolder)
					);
			});
		});
	});

	// Insert Folder

	describe(`POST /api/folders`, () => {
		const testFolders = makeFoldersArray();
		beforeEach('insert folders', () => {
			// return db.into('folders').insert(testFolders);
		});

		it(`adds a new folder to the database`, () => {
			const newFolder = {
				folder_name: 'test-name',
			};
			return supertest(app)
				.post(`/api/folders`)
				.send(newFolder)
				.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
				.expect(201)
				.expect((res) => {
					expect(res.body.folder_name).to.eql(newFolder.folder_name);
					expect(res.headers.location).to.eql(`/api/folders/${res.body.id}`);
				})
				.then((res) =>
					supertest(app)
						.get(`/api/folders/${res.body.id}`)
						.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
						.expect(res.body)
				);
		});

		const requiredFields = ['folder_name'];

		requiredFields.forEach((field) => {
			const newFolder = {
				folder_name: 'test-name',
			};

			it(`responds with 400 missing '${field}' if not supplied`, () => {
				delete newFolder[field];

				return supertest(app)
					.post(`/api/folders`)
					.send(newFolder)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(400, {
						error: { message: `'${field}' is required` },
					});
			});
		});

		it('removes XSS attack content from response', () => {
			const { maliciousFolder, expectedFolder } = makeMaliciousFolder();
			return supertest(app)
				.post(`/api/folders`)
				.send(maliciousFolder)
				.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
				.expect(201)
				.expect((res) => {
					expect(res.body.folder_name).to.eql(expectedFolder.folder_name);
				});
		});
	});

	// Update Folder

	describe(`PATCH /api/folders`, () => {
		context(`Given no folders`, () => {
			it(`responds with 404 when folder doesn't exist`, () => {
				return supertest(app)
					.delete(`/api/folders/123`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(404, {
						error: { message: `Folder doesn't exist` },
					});
			});
		});

		context(`Given there are folders in the database`, () => {
			const testFolders = makeFoldersArray();

			beforeEach('insert folders', () => {
				return db.into('folders').insert(testFolders);
			});

			it('responds with 204 and updates the folder', () => {
				const idToUpdate = 2;
				const updateFolder = {
					folder_name: 'updated folder name',
				};
				const expectedFolder = {
					...testFolders[idToUpdate - 1],
					...updateFolder,
				};
				return supertest(app)
					.patch(`/api/folders/${idToUpdate}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.send(updateFolder)
					.expect(204)
					.then((res) => {
						supertest(app)
							.get(`/api/folders/${idToUpdate}`)
							.expect(expectedFolder);
					});
			});

			it(`responds with 400 when no required fields supplied`, () => {
				const idToUpdate = 2;
				return supertest(app)
					.patch(`/api/folders/${idToUpdate}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.send({ irrelevantField: 'foo' })
					.expect(400, {
						error: {
							message: `Request body must content 'folder_name'`,
						},
					});
			});
		});
	});
});
