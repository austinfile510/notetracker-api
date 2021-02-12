const path = require('path');
const express = require('express');
const xss = require('xss');
const logger = require('../logger');
const { requireAuth } = require('../middleware/jwt-auth');
const TasksService = require('./tasks-service');

const tasksRouter = express.Router();
const jsonParser = express.json();

const serializeTask = (task) => ({
	id: task.id,
	title: xss(task.title),
	content: xss(task.content),
	is_checked: task.is_checked,
	modified: task.modified,
	list_id: task.list_id,
	user_id: task.user_id,
});

// Tasks Route

tasksRouter
	.route('/')
	.all(requireAuth)
	.get((req, res, next) => {
		const currentUser = req.user.id;
		const knexInstance = req.app.get('db');
		TasksService.getAllTasks(knexInstance, currentUser)
			.then((tasks) => {
				res.json(tasks.map(serializeTask));
			})
			.catch(next);
	})
	.post(requireAuth, jsonParser, (req, res, next) => {
		const { title, content, list_id, } = req.body;
		const newTask = { title, content, list_id };

		for (const [key, value] of Object.entries(newTask)) {
			if (!value) {
				logger.error(`${key} is required`);
				return res.status(400).send({
					error: { message: `'${key}' is required` },
				});
			}
		}
		
		newTask.user_id = req.user.id;
		newTask.is_checked = false;
		const knexInstance = req.app.get('db');

		TasksService.insertTask(knexInstance, newTask)
			.then((task) => {
				logger.info(`Task with id ${task.id} created.`);
				res
					.status(201)
					.location(path.posix.join(req.originalUrl + `/${task.id}`))
					.json(serializeTask(task));
			})
			.catch(next);
	});

// Task ID Route

tasksRouter
	.route('/:task_id')
	.all((req, res, next) => {
		const knexInstance = req.app.get('db');
		TasksService.getTaskById(knexInstance, req.params.task_id)
			.then((task) => {
				if (!task) {
					return res.status(404).json({
						error: { message: `Task doesn't exist` },
					});
				}
				res.task = task;
				next();
			})
			.catch(next);
	})

	.get((req, res) => {
		res.json(serializeTask(res.task));
	})

	.delete((req, res, next) => {
		const knexInstance = req.app.get('db');
		const { task_id } = req.params;
		TasksService.deleteTask(knexInstance, req.params.task_id)
			.then((numRowsAffected) => {
				logger.info(`task with id ${task_id} deleted.`);
				res.status(204).end();
			})
			.catch(next);
	})

	.patch(jsonParser, (req, res, next) => {
		const { title, content, list_id } = req.body;
		const taskToUpdate = { title, content, list_id };

		const numberOfValues = Object.values(taskToUpdate).filter(Boolean).length;
		if (numberOfValues === 0) {
			logger.error(`Invalid update without required fields`);
			return res.status(400).json({
				error: {
					message: `Request body must content either 'title', 'content' or 'list_id'`,
				},
			});
		}

		const knexInstance = req.app.get('db');
		TasksService.updateTask(knexInstance, req.params.task_id, taskToUpdate)
			.then((numRowsAffected) => {
				res.status(204).end();
			})
			.catch(next);
	});

module.exports = tasksRouter;
