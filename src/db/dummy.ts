const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

// Read the SQL file directly from the source folder
const sqlPath = path.join(__dirname, "../db/CALENDARIA.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

// Create the database file
const db = new Database("dummy.db");
db.exec(sql);

console.log("✅ dummy.db created successfully from CALENDARIA.sql");
