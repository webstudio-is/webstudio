const gcd = (a: number, b: number): number => {
  return b ? gcd(b, a % b) : a;
};

export const getFormattedAspectRatio = (
  width: number | null,
  height: number | null
) => {
  if (width === null || height === null) {
    return "";
  }
  const divisor = gcd(width, height);

  return `${width / divisor}:${height / divisor}`;
};
