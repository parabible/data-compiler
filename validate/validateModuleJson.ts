const EXPECTED_MODULE_FIELDS = [
  "abbreviation",
  "name",
  "description",
  "corpora",
  "language",
  "versification_schema",
  "license",
  "url",
];

const ALLOWED_VERIFICATION_SCHEMAS = [
  "kjv",
  "lxx",
  "bhs",
  "gnt",
];
const ALLOWED_CORPORA = [
  "OT",
  "NT",
  "ApF",
];

const validateModuleJson: (path: string) => ValidatedModuleJson = (
  path: string,
) => {
  const moduleJson = JSON.parse(
    Deno.readTextFileSync(path),
  );
  const moduleJsonFields = new Set(Object.keys(moduleJson));
  const missingFields = EXPECTED_MODULE_FIELDS.filter((f) =>
    !moduleJsonFields.has(f)
  );
  if (missingFields.length) {
    const missingFieldsString = missingFields.join(", ");
    console.log(
      `Missing fields from module.json in ${path}: ${missingFieldsString}`,
    );
    return [null, true];
  }

  const invalidVersificationSchema = !ALLOWED_VERIFICATION_SCHEMAS.includes(
    moduleJson.versification_schema,
  );
  if (invalidVersificationSchema) {
    console.log(
      `Invalid versification_schema in module.json in ${path}: ${moduleJson.versification_schema}`,
    );
    return [null, true];
  }

  const invalidCorpora = moduleJson.corpora.some((c: string) =>
    !ALLOWED_CORPORA.includes(c)
  );
  if (invalidCorpora) {
    console.log(
      `Invalid corpora in module.json in ${path}: ${moduleJson.corpora}`,
    );
    return [null, true];
  }

  return [moduleJson as ModuleJson, false];
};

export default validateModuleJson;
