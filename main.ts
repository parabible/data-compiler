// Invoke with: deno run -A --unstable main.ts /path/to/modules

import getValidModules from "./getValidModules.ts";
const path = Deno.args[0];

const modules = getValidModules(path);
console.log(modules.map((m) => m.name));
