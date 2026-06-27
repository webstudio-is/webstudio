export const printJson = (value: unknown) => {
  console.info(JSON.stringify(value, undefined, 2));
};
