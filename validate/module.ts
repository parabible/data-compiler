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

type ModuleJson = {
  abbreviation: string;
  name: string;
  description: string;
  corpora: string[];
  language: string;
  versification_schema: string;
  license: string;
  url: string;
};
type ModuleJsonError = boolean;

type ValidatedModuleJson = [
  ModuleJson | null,
  ModuleJsonError,
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
  return [moduleJson, false];
};

export default validateModuleJson;
