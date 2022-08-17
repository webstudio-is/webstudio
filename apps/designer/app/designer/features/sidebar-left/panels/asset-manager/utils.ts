export const getHumanReadableFileSize = (size: number) => {
  const i = Math.floor(Math.log(size) / Math.log(1024));
  const types = ["B", "kB", "MB", "GB", "TB"];
  return `${(size / Math.pow(1024, i)).toFixed(2)} ${types[i]}`;
};

export const getStartAndEndOfString = (str: string) => {
  if (str.length > 20) {
    return str.substr(0, 10) + "..." + str.split(".").pop();
  }
  return str;
};

export const gcd = (a: number, b: number): number => {
  return b ? gcd(b, a % b) : a;
};

export const getAspectRatio = (width: number, height: number) => {
  const divisor = gcd(width, height);

  return `${width / divisor}:${height / divisor}`;
};
