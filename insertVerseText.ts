import { Database } from "https://deno.land/x/sqlite3@0.9.1/mod.ts";
const BATCH_SIZE = 50_000;

let tableIsReady = false;

const prepareTable = (db: Database) => {
  db.exec(`
  DROP TABLE IF EXISTS parallel;
  CREATE TABLE parallel (
    parallel_id INTEGER NOT NULL,
    versification_schema_id INTEGER NOT NULL,
    module_id INTEGER NOT NULL,
    rid INTEGER NOT NULL,
    text TEXT
  );`);
  tableIsReady = true;
};

export default (db: Database, verseTexts: VerseText[]) => {
  if (!tableIsReady) {
    prepareTable(db);
  }
  const insertVerseText = db.prepare(`
      INSERT INTO parallel (
        parallel_id,
        versification_schema_id,
        module_id,
        rid,
        text
      ) VALUES (
        :parallel_id,
        :versification_schema_id,
        :module_id,
        :rid,
        :text
      );
    `);
  const insertVerseTextBatch = db.transaction((batch) => {
    for (const v of batch) {
      insertVerseText.run(v);
    }
  });
  let i = 0;
  while (verseTexts.length) {
    const batch = verseTexts.splice(0, BATCH_SIZE);
    insertVerseTextBatch(batch);
    console.log(`   - Inserted ${i += batch.length} verses`);
  }
};
