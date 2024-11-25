// Convert a string value in assumed MB to bytes number
export const toBytes = (value: string): number =>
  Number.parseFloat(value) * 1e6;
