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

// TODO: Verify typing. I'm not sure if this "|" is the right way to do this. It makes the errors go away, but I'm unconvinced it correctly defines the type.
type WordFeaturesObject = {
  module_id: number;
  parallel_id: number;
} | {
  [feature: string]: string;
};

type ValidatedModuleData = [
  WordFeatures | null,
  ModuleDataError,
];

type VerseText = {
  parallel_id: number;
  versification_schema_id: number;
  module_id: number;
  rid: number;
  text: string;
};
