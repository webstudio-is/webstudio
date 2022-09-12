const gcd = (a: number, b: number): number => {
  return b ? gcd(b, a % b) : a;
};

export const getFormattedAspectRatio = ({
  width,
  height,
}: {
  width?: number;
  height?: number;
}): string => {
  if (width === undefined || height === undefined) {
    return "";
  }
  const divisor = gcd(width, height);

  return `${width / divisor}:${height / divisor}`;
};
