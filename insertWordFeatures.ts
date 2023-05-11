import { Database } from "https://deno.land/x/sqlite3@0.9.1/mod.ts";
const BATCH_SIZE = 50_000;

let tableIsReady = false;
const ensureTableIsReady = (db: Database) => {
  if (!tableIsReady) {
    prepareTable(db);
  }
};
const prepareTable = (db: Database) => {
  db.exec(`
      DROP TABLE IF EXISTS word_features;
      CREATE TABLE word_features (
        word_uid INTEGER PRIMARY KEY,
        module_id INTEGER NOT NULL,
        wid INTEGER NOT NULL,
        leader TEXT,
        text TEXT,
        trailer TEXT,
        rid INTEGER NOT NULL,
        parallel_id INTEGER NOT NULL
      )
    `);
  tableIsReady = true;
};

const knownWordFeatureColumns = [
  "word_uid",
  "module_id",
  "wid",
  "leader",
  "text",
  "trailer",
  "rid",
  "parallel_id",
];

const featureExists = (f: string) => knownWordFeatureColumns.includes(f);

const addFeatureColumn = (db: Database, feature: string) => {
  ensureTableIsReady(db);
  db.exec(`ALTER TABLE word_features ADD COLUMN ${feature} TEXT`);
  knownWordFeatureColumns.push(feature);
};

const insertWordFeatures = (
  db: Database,
  columns: string[],
  wordFeatures: WordFeaturesObject[],
) => {
  ensureTableIsReady(db);
  const insertWordFeatures = db.prepare(`
    INSERT INTO word_features (
        word_uid,
        module_id,
        wid,
        leader,
        text,
        trailer,
        rid,
        parallel_id,
        ${columns.join(", ")}
    ) VALUES (
        :word_uid,
        :module_id,
        :wid,
        :leader,
        :text,
        :trailer,
        :rid,
        :parallel_id,
        ${columns.map((f) => ":" + f).join(", ")}
    );
  `);
  const insertWordFeaturesBatch = db.transaction((batch) => {
    for (const v of batch) {
      insertWordFeatures.run(v);
    }
  });
  let j = 0;
  while (wordFeatures.length) {
    const batch = wordFeatures.splice(0, BATCH_SIZE);
    insertWordFeaturesBatch(batch);
    console.log(`   - Inserted ${j += batch.length} words`);
  }
};
export { addFeatureColumn, featureExists, insertWordFeatures };
