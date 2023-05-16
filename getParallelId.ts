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
const alignmentsFromDb = alignmentDb.prepare(
  `SELECT kjv, bhs, lxx, gnt FROM alignment`,
).all();

alignmentsFromDb.forEach((row, i) => {
  const schemas = Object.keys(row).filter((vs) => row[vs]);
  if (schemas.length === 1) {
    // There's only one alignment, so we don't need to do anything
    // console.log("Single alignment!", row);
    return;
  }
  Object.keys(row).forEach((vs) => {
    if (!row[vs]) return;

    if (alignments?.[vs]?.[row[vs]]) {
      console.log("Duplicate alignment!", row);
      console.log(vs, row[vs]);
      console.log(alignments[vs][row[vs]], i + 1);
      return;
    }

    if (!(vs in alignments)) {
      alignments[vs] = {};
    }
    alignments[vs][row[vs]] = i + 1;

    if (!(i + 1 in parallelIdMap)) {
      parallelIdMap[i + 1] = {};
    }
    parallelIdMap[i + 1][vs] = row[vs];
  });
});

let nextParallelId = alignmentsFromDb.length;
const getParallelId = (
  rid: number,
  versification_schema: VersificationSchema,
) => {
  if (
    versification_schema in alignments &&
    rid in alignments[versification_schema]
  ) {
    return alignments[versification_schema][rid];
  }

  alignments[versification_schema][rid] = nextParallelId;

  if (!(nextParallelId in parallelIdMap)) {
    parallelIdMap[nextParallelId] = {};
  }
  parallelIdMap[nextParallelId][versification_schema] = rid;

  nextParallelId++;
  return alignments[versification_schema][rid];
};

const getComparableRidFromParallelId = (
  parallelId: number,
  schema: VersificationSchema,
) => {
  if (schema in parallelIdMap[parallelId]) {
    return parallelIdMap[parallelId][schema];
  }
  return versification_schema_hierarchy.reduce((acc, vs) => {
    if (vs in parallelIdMap[parallelId] && !acc) {
      return parallelIdMap[parallelId][vs];
    }
    return acc;
  }, parallelIdMap[parallelId]?.[schema] ?? 0);
};

import sortBookIdsBySchema from "./sortBookIdsBySchema.ts";

const sortParallelIdsBySchema =
  (schema: VersificationSchema) => (pidA: number, pidB: number) => {
    if (!(schema in alignments)) {
      throw new Error(`Invalid versification schema: ${schema}`);
    }

    const ridA = getComparableRidFromParallelId(pidA, schema);
    const ridB = getComparableRidFromParallelId(pidB, schema);

    // Use integer division to get the book id (1_000_000)
    const bookA = Math.floor(ridA / 1_000_000);
    const bookB = Math.floor(ridB / 1_000_000);
    if (bookA !== bookB) {
      return sortBookIdsBySchema(bookA, bookB, schema);
    }
    return ridA - ridB;
  };

const getRidFromParallelIdAndSchema = (parallelId: number, schema: string) => {
  if (!(schema in parallelIdMap[parallelId])) {
    return null;
  }
  return parallelIdMap[parallelId][schema];
};

export {
  getParallelId,
  getRidFromParallelIdAndSchema,
  sortParallelIdsBySchema,
};
