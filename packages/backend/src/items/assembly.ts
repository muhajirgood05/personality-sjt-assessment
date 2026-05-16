/**
 * Test Assembly Algorithm
 *
 * Selects and orders personality test items from the item bank to create
 * a test form satisfying all psychometric constraints:
 * - Total items: 120–180
 * - Minimum 24 items per OCEAN dimension
 * - Each dimension appears 10–14 times per test half
 * - Consistency-check pairs placed at least 20 positions apart
 * - Social desirability items placed at least 5 positions apart
 * - Reverse-scored items ≥ 30% of total
 *
 * Uses a seeded PRNG (mulberry32) for deterministic randomization.
 */

import { ItemEntity, OceanDimension } from '@assessment/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ItemBank {
  regular: ItemEntity[];
  consistency: ItemEntity[];
  socialDesirability: ItemEntity[];
}

export interface AssemblyResult {
  items: ItemEntity[];
  seed: number;
}

export interface AssemblyConstraints {
  minTotal: number;
  maxTotal: number;
  minPerDimension: number;
  minDimensionPerHalf: number;
  maxDimensionPerHalf: number;
  consistencyPairMinDistance: number;
  sdItemMinDistance: number;
  minReverseScoreRatio: number;
}

const DEFAULT_CONSTRAINTS: AssemblyConstraints = {
  minTotal: 120,
  maxTotal: 180,
  minPerDimension: 24,
  minDimensionPerHalf: 10,
  maxDimensionPerHalf: 14,
  consistencyPairMinDistance: 20,
  sdItemMinDistance: 5,
  minReverseScoreRatio: 0.30,
};

// ─── Seeded PRNG (Mulberry32) ────────────────────────────────────────────────

/**
 * Mulberry32 — a fast, high-quality 32-bit seeded PRNG.
 * Returns a function that produces values in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle using a seeded PRNG.
 */
function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i]!, result[j]!] = [result[j]!, result[i]!];
  }
  return result;
}

// ─── Helper Functions ────────────────────────────────────────────────────────

const DIMENSIONS = Object.values(OceanDimension);

/**
 * Get the primary OCEAN dimension of an item (used for per-half balancing).
 */
function getItemPrimaryDimension(item: ItemEntity): OceanDimension | null {
  if (item.dimension && Object.values(OceanDimension).includes(item.dimension as OceanDimension)) {
    return item.dimension as OceanDimension;
  }
  if (item.content.type === 'forced_choice') {
    if (Object.values(OceanDimension).includes(item.content.dimensionLeft as OceanDimension)) {
      return item.content.dimensionLeft;
    }
  }
  return null;
}

/**
 * Get all OCEAN dimensions an item contributes to (both sides of forced-choice).
 * Used for the "minimum 24 items per dimension" constraint.
 */
function getItemAllDimensions(item: ItemEntity): OceanDimension[] {
  if (item.content.type === 'forced_choice') {
    const dims: OceanDimension[] = [];
    if (Object.values(OceanDimension).includes(item.content.dimensionLeft as OceanDimension)) {
      dims.push(item.content.dimensionLeft);
    }
    if (Object.values(OceanDimension).includes(item.content.dimensionRight as OceanDimension)) {
      dims.push(item.content.dimensionRight);
    }
    return dims;
  }
  if (item.dimension && Object.values(OceanDimension).includes(item.dimension as OceanDimension)) {
    return [item.dimension as OceanDimension];
  }
  return [];
}

/**
 * Count all dimension occurrences (both sides of forced-choice).
 */
function countAllDimensions(items: ItemEntity[]): Map<OceanDimension, number> {
  const counts = new Map<OceanDimension, number>();
  for (const dim of DIMENSIONS) counts.set(dim, 0);
  for (const item of items) {
    for (const dim of getItemAllDimensions(item)) {
      counts.set(dim, (counts.get(dim) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Count primary dimension occurrences.
 */
function countPrimaryDimensions(items: ItemEntity[]): Map<OceanDimension, number> {
  const counts = new Map<OceanDimension, number>();
  for (const dim of DIMENSIONS) counts.set(dim, 0);
  for (const item of items) {
    const dim = getItemPrimaryDimension(item);
    if (dim) counts.set(dim, (counts.get(dim) ?? 0) + 1);
  }
  return counts;
}

/**
 * Group consistency items into pairs by matchedPairId.
 */
function groupConsistencyPairs(items: ItemEntity[]): [ItemEntity, ItemEntity][] {
  const pairMap = new Map<string, ItemEntity[]>();
  for (const item of items) {
    const key = item.matchedPairId ?? item.id;
    if (!pairMap.has(key)) pairMap.set(key, []);
    pairMap.get(key)!.push(item);
  }
  const pairs: [ItemEntity, ItemEntity][] = [];
  for (const group of pairMap.values()) {
    if (group.length === 2) pairs.push([group[0]!, group[1]!]);
  }
  return pairs;
}

// ─── Main Assembly Function ──────────────────────────────────────────────────

/**
 * Assemble a personality test form from the item bank.
 *
 * @param seed - Numeric seed for deterministic randomization (per-candidate)
 * @param itemBank - The full item bank categorized into regular, consistency, and SD items
 * @param constraints - Optional override for assembly constraints
 * @returns The ordered list of items ready for presentation
 */
export function assembleTest(
  seed: number,
  itemBank: ItemBank,
  constraints: AssemblyConstraints = DEFAULT_CONSTRAINTS,
): AssemblyResult {
  const rng = mulberry32(seed);

  // Phase 1: Select items
  const selectedItems = selectItems(itemBank, constraints, rng);

  // Phase 2: Order items satisfying all placement constraints
  const orderedItems = orderItems(selectedItems, constraints, rng);

  return { items: orderedItems, seed };
}

// ─── Phase 1: Item Selection ─────────────────────────────────────────────────

interface SelectedItems {
  regular: ItemEntity[];
  consistency: ItemEntity[];
  socialDesirability: ItemEntity[];
}

function selectItems(
  itemBank: ItemBank,
  constraints: AssemblyConstraints,
  rng: () => number,
): SelectedItems {
  const sdItems = [...itemBank.socialDesirability];
  const consistencyItems = [...itemBank.consistency];
  const mandatoryItems = [...sdItems, ...consistencyItems];
  const mandatoryCount = mandatoryItems.length;

  // Count how many items per primary dimension are already in mandatory items
  const mandatoryPrimaryDimCounts = countPrimaryDimensions(mandatoryItems);

  // Maximum items per primary dimension across the whole test:
  // Each half can have at most maxDimensionPerHalf, so total max = 2 * max
  const maxPerDimTotal = 2 * constraints.maxDimensionPerHalf;

  // Calculate how many regular items we can add per dimension
  const regularPool = seededShuffle(itemBank.regular, rng);

  // Group regular items by primary dimension
  const byDim = new Map<OceanDimension, ItemEntity[]>();
  for (const dim of DIMENSIONS) byDim.set(dim, []);
  for (const item of regularPool) {
    const dim = getItemPrimaryDimension(item);
    if (dim) byDim.get(dim)!.push(item);
  }

  const selected: ItemEntity[] = [];
  const selectedIds = new Set<string>();

  // Select items per dimension, respecting the max per dimension
  for (const dim of DIMENSIONS) {
    const pool = byDim.get(dim)!;
    const alreadyHave = mandatoryPrimaryDimCounts.get(dim) ?? 0;
    const canAdd = Math.max(0, maxPerDimTotal - alreadyHave);

    // Target: aim for equal distribution. With 120 total and 40 mandatory,
    // we need 80 regular items = 16 per dimension.
    // But cap at canAdd to ensure half-balance is achievable.
    const target = Math.min(canAdd, Math.ceil(16));

    let taken = 0;
    for (const item of pool) {
      if (taken >= target) break;
      if (!selectedIds.has(item.id)) {
        selected.push(item);
        selectedIds.add(item.id);
        taken++;
      }
    }
  }

  // Ensure we have enough total items
  const currentTotal = mandatoryCount + selected.length;
  if (currentTotal < constraints.minTotal) {
    // Add more items from dimensions that still have room
    const remaining = regularPool.filter((i) => !selectedIds.has(i.id));
    const needed = constraints.minTotal - currentTotal;
    let added = 0;
    for (const item of remaining) {
      if (added >= needed) break;
      const dim = getItemPrimaryDimension(item);
      if (dim) {
        const currentDimCount = (mandatoryPrimaryDimCounts.get(dim) ?? 0) +
          selected.filter((s) => getItemPrimaryDimension(s) === dim).length;
        if (currentDimCount >= maxPerDimTotal) continue;
      }
      selected.push(item);
      selectedIds.add(item.id);
      added++;
    }
  }

  // Trim if over max
  while (mandatoryCount + selected.length > constraints.maxTotal) {
    selected.pop();
  }

  // Ensure reverse-score ratio
  const allItems = [...mandatoryItems, ...selected];
  const reverseCount = allItems.filter((i) => i.isReverseScored).length;
  const minReverse = Math.ceil(allItems.length * constraints.minReverseScoreRatio);

  if (reverseCount < minReverse) {
    const deficit = minReverse - reverseCount;
    const availableReverse = regularPool.filter(
      (i) => i.isReverseScored && !selectedIds.has(i.id),
    );
    const nonReverseInSelected = selected.filter((i) => !i.isReverseScored);

    let swapped = 0;
    for (let i = 0; i < deficit && i < availableReverse.length && i < nonReverseInSelected.length; i++) {
      const toRemove = nonReverseInSelected[i]!;
      const toAdd = availableReverse[i]!;
      const idx = selected.findIndex((item) => item.id === toRemove.id);
      if (idx !== -1) {
        selectedIds.delete(selected[idx]!.id);
        selected[idx] = toAdd;
        selectedIds.add(toAdd.id);
        swapped++;
      }
    }

    if (swapped < deficit) {
      for (const item of availableReverse) {
        if (selectedIds.has(item.id)) continue;
        if (mandatoryCount + selected.length >= constraints.maxTotal) break;
        selected.push(item);
        selectedIds.add(item.id);
        swapped++;
        if (swapped >= deficit) break;
      }
    }
  }

  return {
    regular: selected,
    consistency: consistencyItems,
    socialDesirability: sdItems,
  };
}

// ─── Phase 2: Item Ordering ──────────────────────────────────────────────────

function orderItems(
  selected: SelectedItems,
  constraints: AssemblyConstraints,
  rng: () => number,
): ItemEntity[] {
  const allItems = [
    ...selected.regular,
    ...selected.consistency,
    ...selected.socialDesirability,
  ];
  const totalItems = allItems.length;
  const halfPoint = Math.floor(totalItems / 2);

  // Step 1: Assign items to halves with balanced primary dimensions
  const { firstHalfItems, secondHalfItems } = assignToHalves(
    allItems,
    halfPoint,
    constraints,
    rng,
  );

  // Step 2: Order within each half, then combine
  const orderedFirst = seededShuffle(firstHalfItems, rng);
  const orderedSecond = seededShuffle(secondHalfItems, rng);
  let result = [...orderedFirst, ...orderedSecond];

  // Step 3: Fix SD item spacing first (structural change - extract and re-insert)
  result = fixSdSpacing(result, constraints);

  // Step 4: Fix consistency pair spacing (swaps only)
  result = fixConsistencySpacing(result, constraints, rng);

  // Step 5: Repair half-balance if spacing fixes disrupted it
  result = repairHalfBalance(result, constraints, rng);

  // Step 6: Final SD spacing check (in case balance repair moved SD items)
  result = fixSdSpacingSwap(result, constraints);

  return result;
}

/**
 * Assign items to first/second half ensuring each dimension appears
 * 10-14 times per half (by primary dimension).
 */
function assignToHalves(
  items: ItemEntity[],
  halfSize: number,
  constraints: AssemblyConstraints,
  rng: () => number,
): { firstHalfItems: ItemEntity[]; secondHalfItems: ItemEntity[] } {
  // Group by primary dimension
  const byDim = new Map<OceanDimension, ItemEntity[]>();
  const noDim: ItemEntity[] = [];
  for (const dim of DIMENSIONS) byDim.set(dim, []);

  for (const item of items) {
    const dim = getItemPrimaryDimension(item);
    if (dim) {
      byDim.get(dim)!.push(item);
    } else {
      noDim.push(item);
    }
  }

  // Shuffle within each group
  for (const dim of DIMENSIONS) {
    byDim.set(dim, seededShuffle(byDim.get(dim)!, rng));
  }

  const firstHalf: ItemEntity[] = [];
  const secondHalf: ItemEntity[] = [];

  // For each dimension, split items so each half gets within [min, max]
  for (const dim of DIMENSIONS) {
    const pool = byDim.get(dim)!;
    const total = pool.length;

    // Target: split evenly, but clamp to [min, max] per half
    let firstTarget = Math.round(total / 2);
    firstTarget = Math.max(constraints.minDimensionPerHalf, firstTarget);
    firstTarget = Math.min(constraints.maxDimensionPerHalf, firstTarget);
    firstTarget = Math.min(firstTarget, total); // can't exceed available

    for (let i = 0; i < total; i++) {
      if (i < firstTarget) {
        firstHalf.push(pool[i]!);
      } else {
        secondHalf.push(pool[i]!);
      }
    }
  }

  // Add no-dimension items to balance sizes
  const shuffledNoDim = seededShuffle(noDim, rng);
  for (const item of shuffledNoDim) {
    if (firstHalf.length < halfSize) {
      firstHalf.push(item);
    } else {
      secondHalf.push(item);
    }
  }

  return { firstHalfItems: firstHalf, secondHalfItems: secondHalf };
}

/**
 * Fix consistency pair spacing: ensure matched pairs are at least
 * `consistencyPairMinDistance` positions apart.
 */
function fixConsistencySpacing(
  items: ItemEntity[],
  constraints: AssemblyConstraints,
  _rng: () => number,
): ItemEntity[] {
  const result = [...items];
  const pairs = groupConsistencyPairs(result.filter((i) => i.isConsistencyCheck));

  for (let iteration = 0; iteration < 100; iteration++) {
    let allFixed = true;

    for (const [itemA, itemB] of pairs) {
      const posA = result.findIndex((i) => i.id === itemA.id);
      const posB = result.findIndex((i) => i.id === itemB.id);
      if (posA === -1 || posB === -1) continue;

      const distance = Math.abs(posA - posB);
      if (distance >= constraints.consistencyPairMinDistance) continue;

      allFixed = false;

      // Swap the later item with a non-constrained item far enough away
      const [nearPos, farPos] = posA < posB ? [posA, posB] : [posB, posA];
      const targetMin = nearPos + constraints.consistencyPairMinDistance;

      // Find a swap candidate beyond targetMin
      let swapped = false;
      for (let offset = 0; offset < result.length; offset++) {
        const candidatePos = targetMin + offset;
        if (candidatePos >= result.length) break;
        const candidate = result[candidatePos]!;
        if (candidate.isConsistencyCheck || candidate.isSocialDesirabilityItem) continue;

        // Swap
        [result[farPos]!, result[candidatePos]!] = [result[candidatePos]!, result[farPos]!];
        swapped = true;
        break;
      }

      if (!swapped) {
        // Try swapping the near item to an earlier position
        const targetMax = farPos - constraints.consistencyPairMinDistance;
        for (let candidatePos = Math.max(0, targetMax); candidatePos >= 0; candidatePos--) {
          const candidate = result[candidatePos]!;
          if (candidate.isConsistencyCheck || candidate.isSocialDesirabilityItem) continue;
          [result[nearPos]!, result[candidatePos]!] = [result[candidatePos]!, result[nearPos]!];
          break;
        }
      }
    }

    if (allFixed) break;
  }

  return result;
}

/**
 * Fix SD item spacing: ensure no two SD items are within
 * `sdItemMinDistance` positions of each other.
 *
 * Strategy: Extract all SD items, remove them from the list,
 * then re-insert them at evenly spaced positions.
 */
function fixSdSpacing(
  items: ItemEntity[],
  constraints: AssemblyConstraints,
): ItemEntity[] {
  const result = [...items];

  // Extract SD items and their current positions
  const sdIndices: number[] = [];
  for (let i = 0; i < result.length; i++) {
    if (result[i]!.isSocialDesirabilityItem) {
      sdIndices.push(i);
    }
  }

  if (sdIndices.length <= 1) return result;

  // Check if already valid
  let valid = true;
  for (let i = 1; i < sdIndices.length; i++) {
    if (sdIndices[i]! - sdIndices[i - 1]! < constraints.sdItemMinDistance) {
      valid = false;
      break;
    }
  }
  if (valid) return result;

  // Extract SD items
  const sdItems: ItemEntity[] = sdIndices.map((i) => result[i]!);
  const nonSdItems: ItemEntity[] = result.filter((item) => !item.isSocialDesirabilityItem);

  // Calculate evenly spaced positions for SD items within the full list
  const totalLength = result.length;
  const spacing = Math.floor(totalLength / (sdItems.length + 1));

  // Build the new list by inserting SD items at calculated positions
  const newResult: ItemEntity[] = [];
  let sdIdx = 0;
  let nonSdIdx = 0;

  for (let pos = 0; pos < totalLength; pos++) {
    // Check if this position should have an SD item
    const nextSdPos = spacing * (sdIdx + 1);
    if (sdIdx < sdItems.length && pos === nextSdPos) {
      newResult.push(sdItems[sdIdx]!);
      sdIdx++;
    } else if (nonSdIdx < nonSdItems.length) {
      newResult.push(nonSdItems[nonSdIdx]!);
      nonSdIdx++;
    }
  }

  // Add any remaining items
  while (sdIdx < sdItems.length) {
    newResult.push(sdItems[sdIdx]!);
    sdIdx++;
  }
  while (nonSdIdx < nonSdItems.length) {
    newResult.push(nonSdItems[nonSdIdx]!);
    nonSdIdx++;
  }

  return newResult;
}

/**
 * Light SD spacing fix using swaps only (doesn't restructure the list).
 * Used as a final pass after other fixes.
 */
function fixSdSpacingSwap(
  items: ItemEntity[],
  constraints: AssemblyConstraints,
): ItemEntity[] {
  const result = [...items];

  for (let iteration = 0; iteration < 100; iteration++) {
    const sdPositions: number[] = [];
    for (let i = 0; i < result.length; i++) {
      if (result[i]!.isSocialDesirabilityItem) sdPositions.push(i);
    }

    let allFixed = true;
    for (let i = 1; i < sdPositions.length; i++) {
      const dist = sdPositions[i]! - sdPositions[i - 1]!;
      if (dist < constraints.sdItemMinDistance) {
        allFixed = false;
        const sdPos = sdPositions[i]!;
        const minTarget = sdPositions[i - 1]! + constraints.sdItemMinDistance;

        // Find a non-SD item at or after minTarget to swap with
        let swapped = false;
        for (let candidatePos = minTarget; candidatePos < result.length; candidatePos++) {
          if (result[candidatePos]!.isSocialDesirabilityItem) continue;
          // Check this swap won't violate spacing with the next SD item
          if (i + 1 < sdPositions.length && candidatePos >= sdPositions[i + 1]! - constraints.sdItemMinDistance + 1) {
            continue;
          }
          [result[sdPos]!, result[candidatePos]!] = [result[candidatePos]!, result[sdPos]!];
          swapped = true;
          break;
        }
        if (!swapped) {
          // Try any position that satisfies the constraint
          for (let candidatePos = minTarget; candidatePos < result.length; candidatePos++) {
            if (result[candidatePos]!.isSocialDesirabilityItem) continue;
            [result[sdPos]!, result[candidatePos]!] = [result[candidatePos]!, result[sdPos]!];
            break;
          }
        }
        break;
      }
    }
    if (allFixed) break;
  }

  return result;
}

/**
 * Repair half-balance after spacing fixes may have disrupted it.
 * Swaps items between halves to restore the 10-14 per dimension constraint.
 */
function repairHalfBalance(
  items: ItemEntity[],
  constraints: AssemblyConstraints,
  rng: () => number,
): ItemEntity[] {
  const result = [...items];
  const halfPoint = Math.floor(result.length / 2);

  for (let iteration = 0; iteration < 1000; iteration++) {
    const firstCounts = countPrimaryDimensions(result.slice(0, halfPoint));
    const secondCounts = countPrimaryDimensions(result.slice(halfPoint));

    // Check if all balanced
    let allBalanced = true;
    for (const dim of DIMENSIONS) {
      const fc = firstCounts.get(dim) ?? 0;
      const sc = secondCounts.get(dim) ?? 0;
      if (fc < constraints.minDimensionPerHalf || fc > constraints.maxDimensionPerHalf ||
          sc < constraints.minDimensionPerHalf || sc > constraints.maxDimensionPerHalf) {
        allBalanced = false;
        break;
      }
    }
    if (allBalanced) break;

    // Find a dimension that's over in one half
    let swapDone = false;

    for (const dim of DIMENSIONS) {
      const fc = firstCounts.get(dim) ?? 0;
      const sc = secondCounts.get(dim) ?? 0;

      if (fc > constraints.maxDimensionPerHalf && sc < constraints.maxDimensionPerHalf) {
        // Move dim item from first half to second half
        const srcCandidates: number[] = [];
        for (let i = 0; i < halfPoint; i++) {
          const item = result[i]!;
          if (item.isConsistencyCheck || item.isSocialDesirabilityItem) continue;
          if (getItemPrimaryDimension(item) === dim) srcCandidates.push(i);
        }
        const tgtCandidates: number[] = [];
        for (let i = halfPoint; i < result.length; i++) {
          const item = result[i]!;
          if (item.isConsistencyCheck || item.isSocialDesirabilityItem) continue;
          if (getItemPrimaryDimension(item) !== dim) tgtCandidates.push(i);
        }
        if (srcCandidates.length > 0 && tgtCandidates.length > 0) {
          const src = srcCandidates[Math.floor(rng() * srcCandidates.length)]!;
          const tgt = tgtCandidates[Math.floor(rng() * tgtCandidates.length)]!;
          [result[src]!, result[tgt]!] = [result[tgt]!, result[src]!];
          swapDone = true;
          break;
        }
      }

      if (sc > constraints.maxDimensionPerHalf && fc < constraints.maxDimensionPerHalf) {
        // Move dim item from second half to first half
        const srcCandidates: number[] = [];
        for (let i = halfPoint; i < result.length; i++) {
          const item = result[i]!;
          if (item.isConsistencyCheck || item.isSocialDesirabilityItem) continue;
          if (getItemPrimaryDimension(item) === dim) srcCandidates.push(i);
        }
        const tgtCandidates: number[] = [];
        for (let i = 0; i < halfPoint; i++) {
          const item = result[i]!;
          if (item.isConsistencyCheck || item.isSocialDesirabilityItem) continue;
          if (getItemPrimaryDimension(item) !== dim) tgtCandidates.push(i);
        }
        if (srcCandidates.length > 0 && tgtCandidates.length > 0) {
          const src = srcCandidates[Math.floor(rng() * srcCandidates.length)]!;
          const tgt = tgtCandidates[Math.floor(rng() * tgtCandidates.length)]!;
          [result[src]!, result[tgt]!] = [result[tgt]!, result[src]!];
          swapDone = true;
          break;
        }
      }

      if (fc < constraints.minDimensionPerHalf && sc > constraints.minDimensionPerHalf) {
        // Need more of dim in first half — bring from second half
        const srcCandidates: number[] = [];
        for (let i = halfPoint; i < result.length; i++) {
          const item = result[i]!;
          if (item.isConsistencyCheck || item.isSocialDesirabilityItem) continue;
          if (getItemPrimaryDimension(item) === dim) srcCandidates.push(i);
        }
        const tgtCandidates: number[] = [];
        for (let i = 0; i < halfPoint; i++) {
          const item = result[i]!;
          if (item.isConsistencyCheck || item.isSocialDesirabilityItem) continue;
          if (getItemPrimaryDimension(item) !== dim) tgtCandidates.push(i);
        }
        if (srcCandidates.length > 0 && tgtCandidates.length > 0) {
          const src = srcCandidates[Math.floor(rng() * srcCandidates.length)]!;
          const tgt = tgtCandidates[Math.floor(rng() * tgtCandidates.length)]!;
          [result[src]!, result[tgt]!] = [result[tgt]!, result[src]!];
          swapDone = true;
          break;
        }
      }

      if (sc < constraints.minDimensionPerHalf && fc > constraints.minDimensionPerHalf) {
        // Need more of dim in second half — bring from first half
        const srcCandidates: number[] = [];
        for (let i = 0; i < halfPoint; i++) {
          const item = result[i]!;
          if (item.isConsistencyCheck || item.isSocialDesirabilityItem) continue;
          if (getItemPrimaryDimension(item) === dim) srcCandidates.push(i);
        }
        const tgtCandidates: number[] = [];
        for (let i = halfPoint; i < result.length; i++) {
          const item = result[i]!;
          if (item.isConsistencyCheck || item.isSocialDesirabilityItem) continue;
          if (getItemPrimaryDimension(item) !== dim) tgtCandidates.push(i);
        }
        if (srcCandidates.length > 0 && tgtCandidates.length > 0) {
          const src = srcCandidates[Math.floor(rng() * srcCandidates.length)]!;
          const tgt = tgtCandidates[Math.floor(rng() * tgtCandidates.length)]!;
          [result[src]!, result[tgt]!] = [result[tgt]!, result[src]!];
          swapDone = true;
          break;
        }
      }
    }

    if (!swapDone) break;
  }

  return result;
}

// ─── Validation Utilities ────────────────────────────────────────────────────

/**
 * Validate that an assembled test satisfies all constraints.
 */
export function validateAssembly(
  result: AssemblyResult,
  constraints: AssemblyConstraints = DEFAULT_CONSTRAINTS,
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  const { items } = result;

  // Check total count
  if (items.length < constraints.minTotal || items.length > constraints.maxTotal) {
    violations.push(
      `Total items ${items.length} not in range [${constraints.minTotal}, ${constraints.maxTotal}]`,
    );
  }

  // Check dimension counts (using all dimensions)
  const dimCounts = countAllDimensions(items);
  for (const dim of DIMENSIONS) {
    const count = dimCounts.get(dim) ?? 0;
    if (count < constraints.minPerDimension) {
      violations.push(
        `Dimension ${dim} has ${count} items, minimum is ${constraints.minPerDimension}`,
      );
    }
  }

  // Check dimension balance per half (using primary dimension)
  const halfPoint = Math.floor(items.length / 2);
  const firstHalf = items.slice(0, halfPoint);
  const secondHalf = items.slice(halfPoint);
  const firstCounts = countPrimaryDimensions(firstHalf);
  const secondCounts = countPrimaryDimensions(secondHalf);

  for (const dim of DIMENSIONS) {
    const fc = firstCounts.get(dim) ?? 0;
    const sc = secondCounts.get(dim) ?? 0;
    if (fc < constraints.minDimensionPerHalf || fc > constraints.maxDimensionPerHalf) {
      violations.push(
        `First half: dimension ${dim} appears ${fc} times, expected [${constraints.minDimensionPerHalf}, ${constraints.maxDimensionPerHalf}]`,
      );
    }
    if (sc < constraints.minDimensionPerHalf || sc > constraints.maxDimensionPerHalf) {
      violations.push(
        `Second half: dimension ${dim} appears ${sc} times, expected [${constraints.minDimensionPerHalf}, ${constraints.maxDimensionPerHalf}]`,
      );
    }
  }

  // Check consistency pair spacing
  const consistencyItems = items.filter((i) => i.isConsistencyCheck);
  const pairs = groupConsistencyPairs(consistencyItems);
  for (const [itemA, itemB] of pairs) {
    const posA = items.findIndex((i) => i.id === itemA.id);
    const posB = items.findIndex((i) => i.id === itemB.id);
    if (posA !== -1 && posB !== -1) {
      const distance = Math.abs(posA - posB);
      if (distance < constraints.consistencyPairMinDistance) {
        violations.push(
          `Consistency pair (${itemA.id}, ${itemB.id}) distance is ${distance}, minimum is ${constraints.consistencyPairMinDistance}`,
        );
      }
    }
  }

  // Check SD item spacing
  const sdPositions: number[] = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i]!.isSocialDesirabilityItem) sdPositions.push(i);
  }
  for (let i = 1; i < sdPositions.length; i++) {
    const distance = sdPositions[i]! - sdPositions[i - 1]!;
    if (distance < constraints.sdItemMinDistance) {
      violations.push(
        `SD items at positions ${sdPositions[i - 1]} and ${sdPositions[i]} are ${distance} apart, minimum is ${constraints.sdItemMinDistance}`,
      );
    }
  }

  // Check reverse-score ratio
  const reverseCount = items.filter((i) => i.isReverseScored).length;
  const ratio = reverseCount / items.length;
  if (ratio < constraints.minReverseScoreRatio) {
    violations.push(
      `Reverse-scored ratio is ${(ratio * 100).toFixed(1)}%, minimum is ${(constraints.minReverseScoreRatio * 100).toFixed(1)}%`,
    );
  }

  return { valid: violations.length === 0, violations };
}
