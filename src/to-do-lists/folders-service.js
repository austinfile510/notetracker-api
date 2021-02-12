const FoldersService = {
    getAllFolders(knex) {
        return knex.select('*').from('folders')
    },
    getById(knex, id) {
        return knex.from('folders').select('*').where('id', id).first();
    },
    insertFolder(knex, newFolder) {
        return knex
        .insert(newFolder)
        .into('folders')
        .returning('*')
        .then((rows) => {
            return rows[0];
        });
    },
    deleteFolder(knex, id) {
        return knex('folders').where({ id }).delete();
    },
    updateFolder(knex, id, newFolderName) {
        return knex('folders').where({ id }).update(newFolderName);
    }
};

module.exports = FoldersService;