const path = require('path');
const express = require('express');
const xss = require('xss');
const logger = require('../logger');
const ToDoListsService = require('./to-do-lists-service');
const { requireAuth } = require('../middleware/jwt-auth');

const listsRouter = express.Router();
const jsonParser = express.json();

const serializeList = (list) => ({
	id: list.id,
	list_name: xss(list.list_name),
	user_id: list.user_id,
});

// Lists Route

listsRouter
	.route('/')
	.all(requireAuth)
	.get((req, res, next) => {
		const currentUser = req.user.id;
		const knexInstance = req.app.get('db');
		ToDoListsService.getAllLists(knexInstance, currentUser)
			.then((lists) => {
				res.json(lists.map(serializeList));
			})
			.catch(next);
	})
	.post(requireAuth, jsonParser, (req, res, next) => {
		const { list_name } = req.body;
		const newList = { list_name };

		for (const [key, value] of Object.entries(newList)) {
			if (!value) {
				logger.error(`${key} is required`);
				return res.status(400).send({
					error: { message: `'${key}' is required` },
				});
			}
		}

		newList.user_id = req.user.id;

		const knexInstance = req.app.get('db');

		ToDoListsService.insertList(knexInstance, newList)
			.then((list) => {
				logger.info(`List with id ${list.id} created.`);
				res
					.status(201)
					.location(path.posix.join(req.originalUrl + `/${list.id}`))
					.json(serializeList(list));
			})
			.catch(next);
	});

// List ID Route

listsRouter
	.route('/:list_id')
	.all(requireAuth)
	.all((req, res, next) => {
		const knexInstance = req.app.get('db');
		ToDoListsService.getListById(knexInstance, req.params.list_id)
			.then((list) => {
				if (!list) {
					return res.status(404).json({
						error: { message: `List doesn't exist` },
					});
				}
				res.list = list;
				next();
			})
			.catch(next);
	})

	.get((req, res) => {
		res.json(serializeList(res.list));
	})

	.delete((req, res, next) => {
		const knexInstance = req.app.get('db');
		const { list_id } = req.params;
		ToDoListsService.deleteList(knexInstance, req.params.list_id)
			.then((numRowsAffected) => {
				logger.info(`List with id ${list_id} deleted.`);
				res.status(204).end();
			})
			.catch(next);
	})

	.patch(jsonParser, (req, res, next) => {
		const { list_name } = req.body;
		const listToUpdate = { list_name };

		const numberOfValues = Object.values(listToUpdate).filter(Boolean).length;
		if (numberOfValues === 0) {
			logger.error(`Invalid update without required fields`);
			return res.status(400).json({
				error: {
					message: `Request body must content 'list_name'`,
				},
			});
		}

		const knexInstance = req.app.get('db');
		ToDoListsService.updateList(knexInstance, req.params.list_id, listToUpdate)
			.then((numRowsAffected) => {
				res.status(204).end();
			})
			.catch(next);
	});

module.exports = listsRouter;
