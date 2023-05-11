// Invoke with: deno run -A --unstable main.ts /path/to/modules
const BATCH_SIZE = 50_000;
const path = Deno.args[0];

// Set up sqlite db for importing modules
import { Database } from "https://deno.land/x/sqlite3@0.9.1/mod.ts";
const db = new Database("build/parabible.sqlite");

import getValidModules from "./getValidModules.ts";
const modulesForInsert = getValidModules(path);
console.log(modulesForInsert.map((m) => m.name));

// -----------------------------------------------------
// Insert module info, assigning module ids and versification schema ids
import insertModuleInfo from "./insertModuleInfo.ts";
const {
  modules,
  versificationSchemas,
} = insertModuleInfo(modulesForInsert, db);
console.log(versificationSchemas);

// -----------------------------------------------------
// Create parallel and word_features tables
db.exec(`
  DROP TABLE IF EXISTS parallel;
  CREATE TABLE parallel (
    parallel_id INTEGER NOT NULL,
    versification_schema_id INTEGER NOT NULL,
    module_id INTEGER NOT NULL,
    rid INTEGER NOT NULL,
    text TEXT
  );
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

// -----------------------------------------------------
// Alter table to have all necessary feature columns
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

const addFeatureColumn = (feature: string) => {
  db.exec(`ALTER TABLE word_features ADD COLUMN ${feature} TEXT`);
  knownWordFeatureColumns.push(feature);
};

const allFeatures = modules.reduce((acc, m) => {
  m.wordFeatures.forEach((f) => acc.add(f));
  return acc;
}, new Set<string>());

allFeatures.forEach((f) => {
  if (!knownWordFeatureColumns.includes(f)) {
    addFeatureColumn(f);
  }
});

// -----------------------------------------------------
// Insert parallel data and word features
import { getParallelId } from "./getParallelId.ts";

modules.forEach((module) => {
  console.log(`Inserting ${module.name}...`);

  const data = new Database(module.pathToData);

  // Insert verse text
  console.log(" - Inserting verse text...");
  const verseTexts = data.prepare("SELECT * FROM verse_text ORDER BY rid;")
    .all()
    .map((v) => ({
      parallel_id: getParallelId(v.rid, module.versification_schema),
      versification_schema_id: module.versification_schema_id,
      module_id: module.module_id,
      rid: v.rid,
      text: v.text,
    }));
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

  // If there are wordFeatures, prepare to insert them
  if (module.wordFeatures.length) {
    console.log(" - Inserting word features...");
    const wordFeatures = data.prepare("SELECT * FROM word_features;").all()
      .map((w) => ({
        ...w,
        module_id: module.module_id,
        parallel_id: getParallelId(w.rid, module.versification_schema),
      }));

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
        ${module.wordFeatures.join(", ")}
      ) VALUES (
        :word_uid,
        :module_id,
        :wid,
        :leader,
        :text,
        :trailer,
        :rid,
        :parallel_id,
        ${module.wordFeatures.map((f) => ":" + f).join(", ")}
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
  }
});

// -----------------------------------------------------
// Create ordering index
import createOrderingIndex from "./createOrderingIndex.ts";
console.log("Creating ordering index...");

createOrderingIndex(db, versificationSchemas);

// Export to csvs
import exportToCsv from "./export.ts";
exportToCsv(db);

db.close();
console.log("Done!");
