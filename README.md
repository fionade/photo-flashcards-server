# Photo Flashcard Server
This Node.js server provides an API for creating German-language quizzes based on object detection. It uses the Google Vision API (credentials must be provided via a .env file)

# Database Setup
Create a database called "personal-flashcards".
Source database_setup.sql.

# Server Setup
* Compilation: `gulp scripts` or `npx gulp scripts`
* Copy assets (images and HTML files): `gulp assets` or `npx gulp assets`
* Execution: `npm start`

# PM2 Setup
* `pm2 start dist/index.js --name photo-flashcards-server`
* `pm2 startup`
* Reset the service: `pm2 unstartup systemd`

# Variables to provide in the .env file
* GOOGLE_APPLICATION_CREDENTIALS=<path_to_file>
* port=<port_number>
* db_user=<database user name>
* db_pw=<database user password>