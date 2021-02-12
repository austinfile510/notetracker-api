const knex = require('knex');
const xss = require('xss');

const ToDoListsService = {
	getAllLists(knex, user_id) {
		return knex.select('*').from('to_do_lists').where('user_id', user_id);
	},
	getListById(knex, id) {
		return knex.from('to_do_lists').select('*').where('id', id).first();
	},
	insertList(knex, newList) {
		return knex
			.insert(newList)
			.into('to_do_lists')
			.returning('*')
			.then((rows) => {
				return rows[0];
			});
	},
	deleteList(knex, id) {
		return knex('to_do_lists').where({ id }).delete();
	},
	updateList(knex, id, newListName) {
		return knex('to_do_lists').where({ id }).update(newListName);
	},
};

module.exports = ToDoListsService;
