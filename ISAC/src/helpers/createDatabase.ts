import db from "../modules/database";

db.create().then(() => console.log("Database created!"));