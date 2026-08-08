import assert from "node:assert/strict";
import { test } from "node:test";
import { computeBlockDiff, type BlockSummary } from "../lib/revision-diff";

test("computeBlockDiff detects added blocks", () => {
  const snapshotA: BlockSummary[] = [
    { id: 1, type: "hero", title: "Hero", sortOrder: 0, visible: true, config: "{}" },
  ];
  const snapshotB: BlockSummary[] = [
    { id: 1, type: "hero", title: "Hero", sortOrder: 0, visible: true, config: "{}" },
    { id: 2, type: "features", title: "Features", sortOrder: 1, visible: true, config: "{}" },
  ];

  const result = computeBlockDiff(snapshotA, snapshotB);

  assert.equal(result.added.length, 1);
  assert.equal(result.added[0].type, "features");
  assert.equal(result.removed.length, 0);
  assert.equal(result.modified.length, 0);
  assert.equal(result.unchanged.length, 1);
});

test("computeBlockDiff detects removed blocks", () => {
  const snapshotA: BlockSummary[] = [
    { id: 1, type: "hero", title: "Hero", sortOrder: 0, visible: true, config: "{}" },
    { id: 2, type: "cta", title: "CTA", sortOrder: 1, visible: true, config: "{}" },
  ];
  const snapshotB: BlockSummary[] = [
    { id: 1, type: "hero", title: "Hero", sortOrder: 0, visible: true, config: "{}" },
  ];

  const result = computeBlockDiff(snapshotA, snapshotB);

  assert.equal(result.removed.length, 1);
  assert.equal(result.removed[0].type, "cta");
  assert.equal(result.added.length, 0);
  assert.equal(result.unchanged.length, 1);
});

test("computeBlockDiff detects modified block properties", () => {
  const snapshotA: BlockSummary[] = [
    { id: 1, type: "hero", title: "Old Title", sortOrder: 0, visible: true, config: '{"bg":"blue"}' },
  ];
  const snapshotB: BlockSummary[] = [
    { id: 1, type: "hero", title: "New Title", sortOrder: 0, visible: true, config: '{"bg":"red"}' },
  ];

  const result = computeBlockDiff(snapshotA, snapshotB);

  assert.equal(result.modified.length, 1);
  assert.deepEqual(result.modified[0].changes.sort(), ["config", "title"]);
  assert.equal(result.modified[0].before.title, "Old Title");
  assert.equal(result.modified[0].after.title, "New Title");
});
