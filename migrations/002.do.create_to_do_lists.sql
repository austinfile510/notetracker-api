CREATE TABLE to_do_lists (
    id INTEGER PRIMARY KEY GENERATED BY DEFAULT as IDENTITY,
    list_name TEXT NOT NULL,
    user_id INTEGER REFERENCES nt_users(id) ON DELETE CASCADE NOT NULL
);