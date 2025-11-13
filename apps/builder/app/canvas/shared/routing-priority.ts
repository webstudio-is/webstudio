const STATIC = 1;
const DYNAMIC = 2;
const SPREAD = 3;

const getSegmentScore = (segment: string) => {
  // give spread the least priority
  if (segment.endsWith("*")) {
    return SPREAD;
  }
  // sort dynamic segments before splat
  if (segment.startsWith(":")) {
    return DYNAMIC;
  }
  // sort static routes before dynamic routes
  return STATIC;
};

export const comparePatterns = (leftPattern: string, rightPattern: string) => {
  const leftSegments = leftPattern.split("/");
  const rightSegments = rightPattern.split("/");
  const commonLength = Math.min(leftSegments.length, rightSegments.length);

  // compare each segment first
  for (let index = 0; index < commonLength; index++) {
    const leftScore = getSegmentScore(leftSegments[index]);
    const rightScore = getSegmentScore(rightSegments[index]);
    if (leftScore !== rightScore) {
      return leftScore - rightScore;
    }
  }

  // compare amount of segments
  const leftLength = leftSegments.length;
  const rightLength = rightSegments.length;
  if (leftLength !== rightLength) {
    return leftLength - rightLength;
  }

  // sort alphabetically
  return leftPattern.localeCompare(rightPattern);
};
