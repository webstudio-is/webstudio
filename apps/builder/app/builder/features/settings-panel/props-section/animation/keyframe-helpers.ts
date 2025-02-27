const multiplier = 10000;

export const calcOffsets = (
  keyframes: { offset?: number | undefined }[]
): number[] => {
  if (keyframes.length === 0) {
    return [];
  }

  const offsets = keyframes.map((k) =>
    k.offset !== undefined ? k.offset * multiplier : undefined
  );
  if (offsets[0] === undefined) {
    offsets[0] = 0;
  }

  if (offsets.at(-1) === undefined) {
    offsets[offsets.length - 1] = 1 * multiplier;
  }

  let prev = 0;

  for (let i = 1; i < offsets.length - 1; ) {
    if (offsets[i] !== undefined) {
      prev = i;
      i++;
      continue;
    }

    if (offsets[i] === undefined) {
      const next = offsets.findIndex((v, vi) => vi >= i && v !== undefined);

      const step = (offsets[next]! - offsets[prev]!) / (next - prev);

      for (let j = prev + 1; j < next; j++) {
        offsets[j] = offsets[j - 1]! + step; // offsets[prev]! + step * (j - prev);
      }
      prev = next;

      i = next + 1;
    }
  }
  return offsets.map((v) => v! / multiplier);
};

// [0, undefined, undefined, 0.5, undefined, 1]
export const findInsertionIndex = (
  keyframes: { offset?: number | undefined }[],
  currentIndex: number
) => {
  const offset = keyframes[currentIndex].offset;
  if (offset === undefined) {
    return currentIndex;
  }

  // There are 2 ways to approach this. Using calcOffsets to find the index would be technically more correct,
  // as it would place the keyframe in the right position. However, visually placing something between "auto" keyframes
  // is not very intuitive. Let's try the "visually correct" way first.

  // Check ordering
  const minLastIndex = keyframes.findLastIndex(
    (keyframe, keyframeIndex) =>
      keyframeIndex !== currentIndex &&
      keyframe.offset !== undefined &&
      keyframe.offset < offset
  );

  const maxFirstIndex = keyframes.findIndex(
    (keyframe, keyframeIndex) =>
      keyframeIndex !== currentIndex &&
      keyframe.offset !== undefined &&
      keyframe.offset > offset
  );

  if (currentIndex < minLastIndex) {
    // [0, 0.5, 0.6, 1], currentIndex = 1, offset = 0.8
    return minLastIndex;
  }

  if (currentIndex > maxFirstIndex && maxFirstIndex !== -1) {
    // [0, 0.5, 0.6, 1], currentIndex = 2, offset = 0.4
    return maxFirstIndex;
  }

  // Do nothing if the current index is already in the right place
  return currentIndex;
};

export const moveItem = <T>(
  keyframes: T[],
  currentIndex: number,
  newIndex: number
): T[] => {
  const newKeyframes = [...keyframes];
  const [keyframe] = newKeyframes.splice(currentIndex, 1);
  newKeyframes.splice(newIndex, 0, keyframe);
  return newKeyframes;
};
