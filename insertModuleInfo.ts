import { Database } from "https://deno.land/x/sqlite3@0.9.1/mod.ts";

const versificationSchemas: { [schema: string]: number } = {};
const getVersificationSchemaId = (versification_schema: string) => {
  if (!versificationSchemas[versification_schema]) {
    versificationSchemas[versification_schema] =
      Object.keys(versificationSchemas).length + 1;
  }
  return versificationSchemas[versification_schema];
};

// sqlite escape quotes
const sqliteEscape = (str: string) => str.replace(/'/g, "''");

export default (modulePartials: ValidModules[], db: Database) => {
  const modules = modulePartials.map((m, i) => ({
    ...m,
    module_id: i + 1,
    versification_schema_id: getVersificationSchemaId(m.versification_schema),
  }));

  db.exec(`
    DROP TABLE IF EXISTS module_info;
    CREATE TABLE module_info (
      module_id SERIAL PRIMARY KEY,
      name TEXT,
      abbreviation TEXT,
      description TEXT,
      corpora TEXT,
      language TEXT,
      versification_schema TEXT,
      versification_schema_id INTEGER NOT NULL,
      license TEXT,
      url TEXT
    );
  `);
  const query = `
    INSERT INTO module_info (
      module_id,
      abbreviation,
      name,
      description,
      corpora,
      language,
      versification_schema,
      versification_schema_id,
      license,
      url
    ) VALUES ${
    modules.map((m) =>
      `(
        ${m.module_id},
        '${sqliteEscape(m.abbreviation)}',
        '${sqliteEscape(m.name)}',
        '${sqliteEscape(m.description)}',
        '${sqliteEscape(m.corpora.join(","))}',
        '${sqliteEscape(m.language)}',
        '${sqliteEscape(m.versification_schema)}',
        ${m.versification_schema_id},
        '${sqliteEscape(m.license)}',
        '${sqliteEscape(m.url)}'
      )`
    ).join(",")
  }`;
  db.exec(query);
  return { modules, versificationSchemas };
};
