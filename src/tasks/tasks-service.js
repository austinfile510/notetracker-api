const knex = require('knex');
const xss = require('xss');

const TasksService = {
	getAllTasks(knex, user_id) {
		return knex.select('*').from('tasks').where('user_id', user_id);
	},
	getTaskById(knex, id) {
		return knex.from('tasks').select('*').where('id', id).first();
	},
	insertTask(knex, newTask) {
		return knex
			.insert(newTask)
			.into('tasks')
			.returning('*')
			.then((rows) => {
				return rows[0];
			});
	},
	deleteTask(knex, id) {
		return knex('tasks').where({ id }).delete();
	},
	updateTask(knex, id, newTaskFields) {
		return knex('tasks').where({ id }).update(newTaskFields);
	},
};

module.exports = TasksService;
