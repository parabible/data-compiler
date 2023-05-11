const { readDirSync } = Deno;
import validateModuleJson from "./validate/validateModuleJson.ts";
import validateModuleData from "./validate/validateModuleData.ts";

const directoryExists = (path: string) => {
  try {
    Deno.statSync(path).isDirectory;
    return true;
  } catch (_) {
    return false;
  }
};

export default (path: string): ValidModules[] => {
  // Ensure that path is a directory
  if (!directoryExists(path)) {
    console.error("Error: path is not a directory");
    Deno.exit(1);
  }

  const potentialModules = readDirSync(path);
  const modules = [];
  for (const potentialModule of potentialModules) {
    if (!potentialModule.isDirectory) {
      // Gotta be a directory to be a module
      continue;
    }
    const modulePath = `${path}/${potentialModule.name}/output`;
    if (!directoryExists(modulePath)) {
      // Gotta have an output folder to be a module
      continue;
    }

    const moduleFiles = Array.from(readDirSync(modulePath))
      .filter((f) => f.isFile)
      .map((f) => f.name);
    if (!moduleFiles.includes("data.sqlite")) {
      // Gotta have a data.sqlite to be a module
      continue;
    }
    if (!moduleFiles.includes("module.json")) {
      // Gotta have a module.json to be a module
      continue;
    }

    const jsonPath = `${modulePath}/module.json`;
    const [moduleJson, jsonError] = validateModuleJson(jsonPath);
    if (jsonError) {
      // Module.json is invalid
      console.error("Module.json is invalid for module at path: ", modulePath);
      continue;
    }

    const dataPath = `${modulePath}/data.sqlite`;
    const [wordFeatures, dataError] = validateModuleData(dataPath);
    if (dataError || wordFeatures === null) {
      // Database is invalid
      console.error("Database is invalid for module at path: ", modulePath);
      continue;
    }

    modules.push({
      pathToData: `${modulePath}/data.sqlite`,
      wordFeatures,
      ...moduleJson as ModuleJson,
    });
  }
  return modules;
};
