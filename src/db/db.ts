import * as SQLite from "expo-sqlite";
import { Kysely } from "kysely";
import { ExpoDialect } from "kysely-expo";
import { DB } from "./schema";
import { loadSQL } from "../utils/loadsql";

// 1. Open the local database
// We do this at the top level because openDatabaseSync is synchronous and safe
const expoDb = SQLite.openDatabaseSync("app_data.db");

// 2. Initialize Kysely
// This creates the "query builder" but doesn't actually talk to the disk yet
export const db = new Kysely<DB>({
  dialect: new ExpoDialect({
    database: expoDb,
  }),
});

// 3. Custom Migration Runner
export async function runMigrations() {
  try {
    // MOVE the await inside here!
    const sql = await loadSQL();

    // Execute the SQL to create tables if they don't exist
    await expoDb.execAsync(sql);

    console.log("🚀 Migrations applied successfully.");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error; // Re-throw so App.tsx can handle it
  }
}
