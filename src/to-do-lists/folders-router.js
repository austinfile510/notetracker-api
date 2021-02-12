const path = require('path');
const express = require('express');
const xss = require('xss');
const logger = require('../logger');
const FoldersService = require('./folders-service');

const foldersRouter = express.Router();
const jsonParser = express.json();

const serializeFolder = (folder) => ({
	id: folder.id,
	folder_name: xss(folder.folder_name),
});

// Folders Route

foldersRouter
	.route('/')
	.get((req, res, next) => {
		const knexInstance = req.app.get('db');
		FoldersService.getAllFolders(knexInstance)
			.then((folders) => {
				res.json(folders.map(serializeFolder));
			})
			.catch(next);
	})
	.post(jsonParser, (req, res, next) => {
		const { folder_name } = req.body;
		const newFolder = { folder_name };

		for (const [key, value] of Object.entries(newFolder)) {
			if (!value) {
				logger.error(`${key} is required`);
				return res.status(400).send({
					error: { message: `'${key}' is required` },
				});
			}
		}

		newFolder.folder_name = folder_name;

		const knexInstance = req.app.get('db');

		FoldersService.insertFolder(knexInstance, newFolder)
			.then((folder) => {
				logger.info(`Folder with id ${folder.id} created.`);
				res
					.status(201)
					.location(path.posix.join(req.originalUrl + `/${folder.id}`))
					.json(serializeFolder(folder));
			})
			.catch(next);
	});

// Folder ID Route

foldersRouter
	.route('/:folder_id')
	.all((req, res, next) => {
		const knexInstance = req.app.get('db');
		FoldersService.getById(knexInstance, req.params.folder_id)
			.then((folder) => {
				if (!folder) {
					return res.status(404).json({
						error: { message: `Folder doesn't exist` },
					});
				}
				res.folder = folder;
				next();
			})
			.catch(next);
	})

	.get((req, res) => {
		res.json(serializeFolder(res.folder));
	})

	.delete((req, res, next) => {
		const knexInstance = req.app.get('db');
		const { folder_id } = req.params;
		FoldersService.deleteFolder(knexInstance, req.params.folder_id)
			.then((numRowsAffected) => {
				numRowsAffected = folder_id;
				logger.info(`Folder with id ${folder_id} deleted.`);
				res.status(204).end();
			})
			.catch(next);
	})

	.patch(jsonParser, (req, res, next) => {
		const { folder_name } = req.body;
		const folderToUpdate = { folder_name };

		const numberOfValues = Object.values(folderToUpdate).filter(Boolean).length;
		if (numberOfValues === 0) {
			logger.error(`Invalid update without required fields`);
			return res.status(400).json({
				error: {
					message: `Request body must content 'folder_name'`,
				},
			});
		}

		const knexInstance = req.app.get('db');
		FoldersService.updateFolder(
			knexInstance,
			req.params.folder_id,
			folderToUpdate
		)
			.then((numRowsAffected) => {
				res.status(204).end();
			})
			.catch(next);
	});

module.exports = foldersRouter;
