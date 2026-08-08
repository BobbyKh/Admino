export interface BlockSummary {
  id?: number;
  type: string;
  title: string | null;
  sortOrder: number;
  visible: boolean;
  config: string | null;
}

export interface BlockDiffResult {
  added: BlockSummary[];
  removed: BlockSummary[];
  modified: Array<{
    before: BlockSummary;
    after: BlockSummary;
    changes: string[];
  }>;
  unchanged: BlockSummary[];
}

/**
 * Computes difference between two snapshots of page blocks.
 */
export function computeBlockDiff(
  snapshotA: BlockSummary[],
  snapshotB: BlockSummary[]
): BlockDiffResult {
  const mapA = new Map<string, BlockSummary>();
  const mapB = new Map<string, BlockSummary>();

  // Use (type + sortOrder) or ID as key for block matching
  const getKey = (block: BlockSummary, index: number) =>
    block.id !== undefined ? `id:${block.id}` : `pos:${block.type}:${index}`;

  snapshotA.forEach((b, idx) => mapA.set(getKey(b, idx), b));
  snapshotB.forEach((b, idx) => mapB.set(getKey(b, idx), b));

  const added: BlockSummary[] = [];
  const removed: BlockSummary[] = [];
  const modified: BlockDiffResult["modified"] = [];
  const unchanged: BlockSummary[] = [];

  for (const [key, blockB] of mapB.entries()) {
    if (!mapA.has(key)) {
      added.push(blockB);
    } else {
      const blockA = mapA.get(key)!;
      const changes: string[] = [];

      if (blockA.type !== blockB.type) changes.push("type");
      if (blockA.title !== blockB.title) changes.push("title");
      if (blockA.visible !== blockB.visible) changes.push("visible");
      if (blockA.sortOrder !== blockB.sortOrder) changes.push("sortOrder");
      if (blockA.config !== blockB.config) changes.push("config");

      if (changes.length > 0) {
        modified.push({ before: blockA, after: blockB, changes });
      } else {
        unchanged.push(blockB);
      }
    }
  }

  for (const [key, blockA] of mapA.entries()) {
    if (!mapB.has(key)) {
      removed.push(blockA);
    }
  }

  return { added, removed, modified, unchanged };
}
