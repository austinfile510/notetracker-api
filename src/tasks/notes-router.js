const path = require('path');
const express = require('express');
const xss = require('xss');
const logger = require('../logger');
const NotesService = require('./notes-service');

const notesRouter = express.Router();
const jsonParser = express.json();

const serializeNote = (note) => ({
	id: note.id,
	title: xss(note.title),
	content: xss(note.content),
	modified: note.modified,
	folder_id: note.folder_id,
});

// Notes Route

notesRouter
	.route('/')
	.get((req, res, next) => {
		const knexInstance = req.app.get('db');
		NotesService.getAllNotes(knexInstance)
			.then((notes) => {
				res.json(notes.map(serializeNote));
			})
			.catch(next);
	})
	.post(jsonParser, (req, res, next) => {
		const { title, content, folder_id, modified } = req.body;
		const newNote = { title, content, folder_id };

		for (const [key, value] of Object.entries(newNote)) {
			if (!value) {
				logger.error(`${key} is required`);
				return res.status(400).send({
					error: { message: `'${key}' is required` },
				});
			}
		}

		newNote.title = title;
		newNote.content = content;
		newNote.folder_id = folder_id;
		// newNote.modified = modified;
		const knexInstance = req.app.get('db');

		NotesService.insertNote(knexInstance, newNote)
			.then((note) => {
				logger.info(`Note with id ${note.id} created.`);
				res
					.status(201)
					.location(path.posix.join(req.originalUrl + `/${note.id}`))
					.json(serializeNote(note));
			})
			.catch(next);
	});

// Note ID Route

notesRouter
	.route('/:note_id')
	.all((req, res, next) => {
		const knexInstance = req.app.get('db');
		NotesService.getById(knexInstance, req.params.note_id)
			.then((note) => {
				if (!note) {
					return res.status(404).json({
						error: { message: `Note doesn't exist` },
					});
				}
				res.note = note;
				next();
			})
			.catch(next);
	})

	.get((req, res) => {
		res.json(serializeNote(res.note));
	})

	.delete((req, res, next) => {
		const knexInstance = req.app.get('db');
		const { note_id } = req.params;
		NotesService.deleteNote(knexInstance, req.params.note_id)
			.then((numRowsAffected) => {
				logger.info(`Note with id ${note_id} deleted.`);
				res.status(204).end();
			})
			.catch(next);
	})

	.patch(jsonParser, (req, res, next) => {
		const { title, content, folder_id } = req.body;
		const noteToUpdate = { title, content, folder_id };

		console.log(noteToUpdate);

		const numberOfValues = Object.values(noteToUpdate).filter(Boolean).length;
		if (numberOfValues === 0) {
			logger.error(`Invalid update without required fields`);
			return res.status(400).json({
				error: {
					message: `Request body must content either 'title', 'content' or 'folder_id'`,
				},
			});
		}

		const knexInstance = req.app.get('db');
		NotesService.updateNote(knexInstance, req.params.note_id, noteToUpdate)
			.then((numRowsAffected) => {
				res.status(204).end();
			})
			.catch(next);
	});

module.exports = notesRouter;
