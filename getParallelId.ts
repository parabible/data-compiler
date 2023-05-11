import { Database } from "https://deno.land/x/sqlite3@0.9.1/mod.ts";
const alignmentDb = new Database("alignment.sqlite");

const versification_schema_hierarchy = [
  "kjv",
  "bhs",
  "gnt",
  "lxx",
];

const alignments: Alignments = {};
const parallelIdMap: {
  [parallelId: number]: {
    [versificationSchema: string]: number;
  };
} = {};
const alignmentsFromDb = alignmentDb.prepare(`SELECT * FROM alignment`).all();

alignmentsFromDb.forEach((a, i) => {
  Object.keys(a).forEach((k) => {
    if (!a[k]) return;

    if (!(k in alignments)) {
      alignments[k] = {};
    }
    alignments[k][a[k]] = i + 1;

    if (!(i + 1 in parallelIdMap)) {
      parallelIdMap[i + 1] = {};
    }
    parallelIdMap[i + 1][k] = a[k];
  });
});

let nextParallelId = alignmentsFromDb.length;
const getParallelId = (rid: number, versification_schema: string) => {
  if (
    versification_schema in alignments &&
    rid in alignments[versification_schema]
  ) {
    return alignments[versification_schema][rid];
  }

  alignments[versification_schema][rid] = nextParallelId;
  parallelIdMap[nextParallelId] = {
    [versification_schema]: rid,
  };
  nextParallelId++;
  return alignments[versification_schema][rid];
};

const getAllParallelIds = () => {
  const allParallelIds = new Set<number>();
  Object.keys(alignments).forEach((vs) => {
    Object.keys(alignments[vs]).forEach((rid) => {
      allParallelIds.add(alignments[vs][+rid]);
    });
  });
  return Array.from(allParallelIds);
};
const sortParallelIdsBySchema = (schema: string) =>
  (pidA: number, pidB: number) => {
    if (!(schema in alignments)) {
      throw new Error(`Invalid versification schema: ${schema}`);
    }

    // Try the preferred schema first
    if (
      schema in parallelIdMap[pidA] &&
      schema in parallelIdMap[pidB]
    ) {
      const ridA = parallelIdMap[pidA][schema];
      const ridB = parallelIdMap[pidB][schema];
      return ridA - ridB;
    }

    // Try the other schemas in the hierarchy
    for (let i = 0; i < versification_schema_hierarchy.length; i++) {
      const vs = versification_schema_hierarchy[i];
      if (vs === schema) {
        // Don't need to check if it's in the schema, we already did that
        continue;
      }

      if (vs in parallelIdMap[pidA] && vs in parallelIdMap[pidB]) {
        const ridA = parallelIdMap[pidA][vs];
        const ridB = parallelIdMap[pidB][vs];
        return ridA - ridB;
      }
    }

    // If all else fails, we just compare the best rid we have
    // The best rid is defined as the highest up on the hierarchy
    const bestRidA = versification_schema_hierarchy.reduce((acc, vs) => {
      if (vs in parallelIdMap[pidA] && !acc) {
        return parallelIdMap[pidA][vs];
      }
      return acc;
    }, parallelIdMap[pidA]?.[schema] ?? 0);
    const bestRidB = versification_schema_hierarchy.reduce((acc, vs) => {
      if (vs in parallelIdMap[pidB] && !acc) {
        return parallelIdMap[pidB][vs];
      }
      return acc;
    }, parallelIdMap[pidB]?.[schema] ?? 0);
    return bestRidA - bestRidB;
  };

const getRidFromParallelIdAndSchema = (parallelId: number, schema: string) => {
  if (!(schema in parallelIdMap[parallelId])) {
    return null;
  }
  return parallelIdMap[parallelId][schema];
};

export {
  getAllParallelIds,
  getParallelId,
  getRidFromParallelIdAndSchema,
  sortParallelIdsBySchema,
};
