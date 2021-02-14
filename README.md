# NoteTracker

An Express API by Austin File
## Live App: 
https://notetracker-client.vercel.app/

## Description/Summary
NoteTracker is a to-do list app built using React. This server provides back end functionality and user account creation through an Express API.

Users can create accounts and save as many to-do lists as they wish to keep track of different projects simultaneously.

You can start using the app by registering a new user account. Click "Register" at the top of the app's page and follow the instructions. After that, you'll be taken to the Login screen and you can begin creating to-do lists.

Users can add and edit tasks they add to each list, and both can be deleted at any time.

## Documentation
This API runs at the following endpoints:

/users - Used to POST new users to the database.

/auth/login - Used to POST login requests

/to-do-lists - GET, retrieves all users' to-do lists. Users can search between the lists freely after login. By default, will render tasks from all lists on login.

/to-do-lists/:list_id - GET, lists tasks from a specific to-do list. 

/tasks GET all tasks from all lists. By default, will render tasks from all lists on login.

/tasks/:task_id GET, POST, and DELETE a specific task. Tasks can be viewed in more detail, change from complete or incomplete, and be deleted by the user.


/my-recipes - Gets the recipes for the currently logged in user.
### Technology Used
This project was created using [Express](https://expressjs.com/), Node.Js, and PostgreSQL. [JWT](https://jwt.io/) is used for user authentication. The database is hosted on [Heroku](https://www.heroku.com/).

Additional Packages used: cors, dotenv, helmet, morgan, knex, winston, postgrator-cli, chai, mocha, nodemon
