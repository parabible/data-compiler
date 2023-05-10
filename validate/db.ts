import { Database } from "https://deno.land/x/sqlite3@0.9.1/mod.ts";
import features from "./features.json" assert { type: "json" };

const EXPECTED_TABLES = [
  "verse_text",
];
const EXPECTED_TABLE_FIELDS = {
  verse_text: [
    "rid",
    "text",
  ],
  word_features: [
    "wid",
    "leader",
    "text",
    "trailer",
    "rid",
  ],
};
const ALLOWED_TABLE_FIELDS = {
  verse_text: [
    "rid",
    "text",
  ],
  word_features: [
    "wid",
    "leader",
    "text",
    "trailer",
    ...features.features.map((f) => f.key),
    ...["sentence", "clause", "phrase"],
    "rid",
  ],
};

const validateModuleData: (path: string) => boolean = (path: string) => {
  const db = new Database(path);
  const tables = db
    .prepare(
      "select name from sqlite_master where type='table' order by name;",
    )
    .all<{ name: string }>()
    .map((t) => t.name);
  const missingTables = EXPECTED_TABLES.filter((t) => !tables.includes(t));
  if (missingTables.length) {
    const missingTablesString = missingTables.join(", ");
    console.log(
      `Missing tables from data.sqlite in ${path}: ${missingTablesString}`,
    );
    return false;
  }

  for (const table of ["verse_text", "word_features"]) {
    const tableFields = db
      .prepare(`pragma table_info(${table});`)
      .all<{ name: string }>()
      .map((f) => f.name);
    // word_features is an optional table
    if (table === "word_features" && !tableFields.length) {
      continue;
    }

    console.log(table);
    const missingFields =
      EXPECTED_TABLE_FIELDS[table as keyof typeof EXPECTED_TABLE_FIELDS].filter(
        (f) => !tableFields.includes(f),
      );
    if (missingFields.length) {
      const missingFieldsString = missingFields.join(", ");
      console.log(
        `Missing fields from ${table} in ${path}: ${missingFieldsString}`,
      );
      return false;
    }

    const extraFields = tableFields.filter((f) =>
      !ALLOWED_TABLE_FIELDS[table as keyof typeof ALLOWED_TABLE_FIELDS]
        .includes(
          f,
        )
    );
    if (extraFields.length) {
      const extraFieldsString = extraFields.join(", ");
      console.log(
        `Extra fields in ${table} in ${path}: ${extraFieldsString}`,
      );
      return false;
    }
  }

  return true;
};

export default validateModuleData;
