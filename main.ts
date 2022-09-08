import { Database } from "https://deno.land/x/sqlite3@0.5.2/mod.ts";

const db = new Database("./build/parabible.sqlite");
const [version] = db.prepare("select sqlite_version()").get<[string]>()!;
console.log(version);

db.close();
