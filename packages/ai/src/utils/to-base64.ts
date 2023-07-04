export const toBase64 = function toBase64(data: string): string {
  return new Buffer(data).toString("base64");
};

export const svgToBase64 = function svgToBase64(data: string): string {
  return `data:image/svg+xml;base64,${toBase64(data)}`;
};
