import { Database } from "https://deno.land/x/sqlite3@0.9.1/mod.ts";
import {
  getRidFromParallelIdAndSchema,
  sortParallelIdsBySchema,
} from "./getParallelId.ts";
const BATCH_SIZE = 25000;

export default function (
  db: Database,
  versificationSchemas: { [key: string]: number },
) {
  db.exec(`
  DROP TABLE IF EXISTS ordering_index;
  CREATE TABLE ordering_index (
    parallel_id INTEGER NOT NULL,
    versification_schema_id INTEGER NOT NULL,
    rid INTEGER,
    order_in_schema INTEGER NOT NULL
  );
`);

  const allPids = db.prepare("SELECT DISTINCT parallel_id FROM parallel;")
    .all()
    .map((p) => p.parallel_id);
  console.log("Parallel ids to order:", allPids.length);
  Object.keys(versificationSchemas).forEach((vs) => {
    const pids = allPids.slice().sort(sortParallelIdsBySchema(vs));
    // write to file
    const orderIndex = pids.map((pid, i) => ({
      parallel_id: pid,
      versification_schema_id: versificationSchemas[vs],
      rid: getRidFromParallelIdAndSchema(pid, vs),
      order_in_schema: i + 1,
    }));
    const insertOrderIndex = db.prepare(`
    INSERT INTO ordering_index (
      parallel_id,
      versification_schema_id,
      rid,
      order_in_schema
    ) VALUES (
      :parallel_id,
      :versification_schema_id,
      :rid,
      :order_in_schema
    );
  `);
    const insertOrderIndexBatch = db.transaction((batch) => {
      for (const v of batch) {
        insertOrderIndex.run(v);
      }
    });
    let i = 0;
    while (orderIndex.length) {
      const batch = orderIndex.splice(0, BATCH_SIZE);
      insertOrderIndexBatch(batch);
      console.log(`   - Inserted ${i += batch.length} verses`);
    }
  });
}
