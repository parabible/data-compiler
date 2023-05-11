import { Database } from "https://deno.land/x/sqlite3@0.9.1/mod.ts";
import { stringify } from "https://deno.land/std@0.186.0/csv/mod.ts";
import {
  compress,
  init,
} from "https://deno.land/x/zstd_wasm@0.0.20/deno/zstd.ts";

await init();
export default function (db: Database) {
  const tableQuery = "SELECT name FROM sqlite_master WHERE type='table'";
  const tables = db.prepare(tableQuery).all();

  // Export each table to a CSV file and compress it
  for (const table of tables) {
    const tableName = table.name;

    // Get headers
    const headersQuery = `PRAGMA table_info(${tableName})`;
    const headers = db.prepare(headersQuery).all().map((h) => h.name);

    const query = `SELECT * FROM ${tableName}`;
    const rows = db.prepare(query).all();

    const csvBytes = new TextEncoder().encode(stringify(rows, {
      headers: true,
      columns: headers,
    }));

    // Compress the CSV file using Zstd and write
    const compressedData = compress(csvBytes);
    Deno.writeFileSync(`build/${tableName}.csv.zst`, compressedData);

    console.log(`Table '${tableName}' exported and compressed.`);
  }
}
