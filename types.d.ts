type ModuleInfo = {
  module_id: number;
  abbreviation: string;
  name: string;
  description: string;
  corpora: string[];
  language: string;
  versification_schema: string;
  versification_schema_id: number;
  license: string;
  url: string;
};

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

type ValidModules = ModuleJson & {
  pathToData: string;
  wordFeatures: string[];
};

type Alignments = {
  [versificationSchema: string]: {
    [rid: number]: number;
  };
};

type WordFeatures = string[];
type ModuleDataError = boolean;

type ValidatedModuleData = [
  WordFeatures | null,
  ModuleDataError,
];
