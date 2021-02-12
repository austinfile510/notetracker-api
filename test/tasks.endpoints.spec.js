const knex = require('knex');
const { makeNotesArray, makeMaliciousNote } = require('./notes-fixtures');
const { makeFoldersArray } = require('./folders-fixtures');
const app = require('../src/app');
const { addColors } = require('winston/lib/winston/config');
const supertest = require('supertest');
const { expect } = require('chai');

describe('Notes Endpoints', function () {
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
		const testNotes = makeNotesArray();
		const testFolders = makeFoldersArray();

		beforeEach('insert notes', () => {
			return db
				.into('folders')
				.insert(testFolders)
				.then(() => {
					return db.into('notes').insert(testNotes);
				});
		});

		it(`responds with 401 Unauthorized for GET /api/notes`, () => {
			return supertest(app)
				.get('/api/notes')
				.expect(401, { error: 'Unauthorized request' });
		});

		it(`responds with 401 Unauthorized for POST /api/notes`, () => {
			return supertest(app)
				.post('/api/notes')
				.send({
					title: 'Something',
					content: 'Test new Note content',
					note_id: 1,
				})
				.expect(401, { error: 'Unauthorized request' });
		});

		it(`responds with 401 Unauthorized for GET /api/notes/:id`, () => {
			const secondNote = testNotes[1];
			return supertest(app)
				.get(`/api/notes/${secondNote.id}`)
				.expect(401, { error: 'Unauthorized request' });
		});

		it(`responds with 401 Unauthorized for DELETE /api/notes/:id`, () => {
			const aNote = testNotes[1];
			return supertest(app)
				.delete(`/api/notes/${aNote.id}`)
				.expect(401, { error: 'Unauthorized request' });
		});

		it(`responds with 401 Unauthorized for PATCH /api/notes/:id`, () => {
			const aNote = testNotes[1];
			return supertest(app)
				.patch(`/api/notes/${aNote.id}`)
				.send({ title: 'updated-title' })
				.expect(401, { error: 'Unauthorized request' });
		});
	});

	// GET Requests

	// GET all Notes
	describe(`GET /api/notes`, () => {
		context(`Given no notes`, () => {
			it(`responds with 200 and an empty list`, () => {
				return supertest(app)
					.get('/api/notes')
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(200, []);
			});
		});

		context('Given there are notes in the database', () => {
			const testNotes = makeNotesArray();
			const testFolders = makeFoldersArray();

			beforeEach('insert notes', () => {
				return db
					.into('folders')
					.insert(testFolders)
					.then(() => {
						return db.into('notes').insert(testNotes);
					});
			});

			it('responds with 200 and all the notes', () => {
				return supertest(app)
					.get('/api/notes')
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(200, testNotes);
			});
		});

		context(`Given an XSS attack note`, () => {
			const testFolders = makeFoldersArray();
			const { maliciousNote, expectedNote } = makeMaliciousNote();

			beforeEach('insert malicious note', () => {
				return db
					.into('folders')
					.insert(testFolders)
					.then(() => {
						return db.into('notes').insert([maliciousNote]);
					});
			});

			it('removes XSS attack content', () => {
				return supertest(app)
					.get(`/api/notes`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(200)
					.expect((res) => {
						expect(res.body[0].title).to.eql(expectedNote.title);
						expect(res.body[0].content).to.eql(expectedNote.content);
					});
			});
		});
	});

	// GET Note by id

	describe(`GET /api/notes/:note_id`, () => {
		context(`Given no notes`, () => {
			it(`responds with 404`, () => {
				const fakeNoteId = 123456;
				return supertest(app)
					.get(`/api/notes/${fakeNoteId}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(404, { error: { message: `Note doesn't exist` } });
			});
		});

		context(`Given there are notes in the database`, () => {
			const testFolders = makeFoldersArray();
			const testNotes = makeNotesArray();

			beforeEach('insert notes', () => {
				return db
					.into('folders')
					.insert(testFolders)
					.then(() => {
						return db.into('notes').insert(testNotes);
					});
			});

			it(`responds with 200 and the specified Note`, () => {
				const noteId = 2;
				const expectedNote = testNotes[noteId - 1];
				return supertest(app)
					.get(`/api/notes/${noteId}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(200, expectedNote);
			});
		});

		context(`Given an XSS attack note`, () => {
			const testFolders = makeFoldersArray();
			const { maliciousNote, expectedNote } = makeMaliciousNote();

			beforeEach('insert malicious note', () => {
				return db
					.into('folders')
					.insert(testFolders)
					.then(() => {
						return db.into('notes').insert([maliciousNote]);
					});
			});

			it('removes XSS attack content', () => {
				return supertest(app)
					.get(`/api/notes`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(200)
					.expect((res) => {
						expect(res.body[0].title).to.eql(expectedNote.title);
						expect(res.body[0].content).to.eql(expectedNote.content);
					});
			});
		});
	});

	// Delete Note

	describe(`DELETE /api/notes:id`, () => {
		context(`Given no notes`, () => {
			it(`responds with 404 when note doesn't exist`, () => {
				return supertest(app)
					.delete(`/api/notes/123`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(404, {
						error: { message: `Note doesn't exist` },
					});
			});
		});

		context(`Given there are notes in the database`, () => {
			const testFolders = makeFoldersArray();
			const testNotes = makeNotesArray();

			beforeEach('insert notes', () => {
				return db
					.into('folders')
					.insert(testFolders)
					.then(() => {
						return db.into('notes').insert(testNotes);
					});
			});

			it(`removes the note by ID from the database`, () => {
				const idToRemove = 2;
				const expectedNote = testNotes.filter((fr) => fr.id !== idToRemove);
				return supertest(app)
					.delete(`/api/notes/${idToRemove}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(204)
					.then(() =>
						supertest(app)
							.get(`/api/notes`)
							.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
							.expect(expectedNote)
					);
			});
		});
	});

	// Insert Note

	describe(`POST /api/notes`, () => {
		const testFolders = makeFoldersArray();
		beforeEach('insert folders', () => {
			return db.into('folders').insert(testFolders);
		});

		it(`adds a new note to the database`, () => {
			const newNote = {
				title: 'Something',
				content: 'Test new Note content',
				folder_id: 1,
			};
			return supertest(app)
				.post(`/api/notes`)
				.send(newNote)
				.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
				.expect(201)
				.expect((res) => {
					expect(res.body.title).to.eql(newNote.title);
					expect(res.body.content).to.eql(newNote.content);
					expect(res.body.folder_id).to.eql(newNote.folder_id);
					expect(res.headers.location).to.eql(`/api/notes/${res.body.id}`);
					const expected = new Intl.DateTimeFormat('en-US').format(new Date());
					const actual = new Intl.DateTimeFormat('en-US').format(
						new Date(res.body.modified)
					);
					expect(actual).to.eql(expected);
				})
				.then((res) =>
					supertest(app)
						.get(`/api/notes/${res.body.id}`)
						.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
						.expect(res.body)
				);
		});

		const requiredFields = ['title', 'content', 'folder_id'];

		requiredFields.forEach((field) => {
			const newNote = {
				title: 'test-name',
				content: 'Add new content',
				folder_id: 1,
			};

			it(`responds with 400 missing '${field}' if not supplied`, () => {
				delete newNote[field];

				return supertest(app)
					.post(`/api/notes`)
					.send(newNote)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(400, {
						error: { message: `'${field}' is required` },
					});
			});
		});

		it('removes XSS attack content from response', () => {
			const { maliciousNote, expectedNote } = makeMaliciousNote();
			return supertest(app)
				.post(`/api/notes`)
				.send(maliciousNote)
				.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
				.expect(201)
				.expect((res) => {
					expect(res.body.title).to.eql(expectedNote.title);
					expect(res.body.content).to.eql(expectedNote.content);
				});
		});
	});

	// Update Note

	describe(`PATCH /api/notes`, () => {
		context(`Given no notes`, () => {
			it(`responds with 404 when note doesn't exist`, () => {
				return supertest(app)
					.delete(`/api/notes/123`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(404, {
						error: { message: `Note doesn't exist` },
					});
			});
		});

		context(`Given there are notes in the database`, () => {
			const testFolders = makeFoldersArray();
			const testNotes = makeNotesArray();

			beforeEach('insert folders', () => {
				return db
					.into('folders')
					.insert(testFolders)
					.then(() => {
						return db.into('notes').insert(testNotes);
					});
			});

			it('responds with 204 and updates the Note', () => {
				const idToUpdate = 2;
				const updateNote = {
					title: 'updated-title',
					content: 'Updated note',
					folder_id: 1,
				};
				const expectedNote = {
					...testNotes[idToUpdate - 1],
					...updateNote,
				};
				return supertest(app)
					.patch(`/api/notes/${idToUpdate}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.send(updateNote)
					.expect(204)
					.then((res) => {
						return supertest(app)
							.get(`/api/notes/${idToUpdate}`)
							.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
							.expect(expectedNote);
					});
			});

			it(`responds with 400 when no required fields supplied`, () => {
				const idToUpdate = 2;
				return supertest(app)
					.patch(`/api/notes/${idToUpdate}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.send({ irrelevantField: 'foo' })
					.expect(400, {
						error: {
							message: `Request body must content either 'title', 'content' or 'folder_id'`,
						},
					});
			});

			it(`responds with 204 when updating only a subset of fields`, () => {
				const idToUpdate = 2;
				const updateNote = {
					title: 'updated note title',
				};
				const expectedNote = {
					...testNotes[idToUpdate - 1],
					...updateNote,
				};

				return supertest(app)
					.patch(`/api/notes/${idToUpdate}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.send({
						...updateNote,
						fieldToIgnore: 'should not be in GET response',
					})
					.expect(204)
					.then((res) =>
						supertest(app)
							.get(`/api/notes/${idToUpdate}`)
							.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
							.expect(expectedNote)
					);
			});
		});
	});
});
