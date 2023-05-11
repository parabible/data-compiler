// Invoke with: deno run -A --unstable main.ts /path/to/modules
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
// -----------------------------------------------------
// -----------------------------------------------------
// PREPARE TO INSERT DATA
import insertVerseText from "./insertVerseText.ts";
import {
  addFeatureColumn,
  featureExists,
  insertWordFeatures,
} from "./insertWordFeatures.ts";

// -----------------------------------------------------
// Alter table to have all necessary feature columns
const allFeatures = modules.reduce((acc, m) => {
  m.wordFeatures.forEach((f) => acc.add(f));
  return acc;
}, new Set<string>());

allFeatures.forEach((f) => {
  if (!featureExists(f)) {
    addFeatureColumn(db, f);
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
  insertVerseText(db, verseTexts);

  // If there are wordFeatures, prepare to insert them
  if (module.wordFeatures.length) {
    const columns = module.wordFeatures;
    console.log(" - Inserting word features...");
    const wordFeaturesContent: WordFeaturesObject[] = data.prepare(
      "SELECT * FROM word_features;",
    )
      .all()
      .map((w) => ({
        ...w,
        module_id: module.module_id,
        parallel_id: getParallelId(w.rid, module.versification_schema),
      }));
    insertWordFeatures(db, columns, wordFeaturesContent);
  }
});

// -----------------------------------------------------
// Create ordering index
import createOrderingIndex from "./createOrderingIndex.ts";
console.log("Creating ordering index...");

createOrderingIndex(db, versificationSchemas);

// Export to csvs
import exportToCompressedCsv from "./exportToCompressedCsv.ts";
exportToCompressedCsv(db);

db.close();
console.log("Done!");
