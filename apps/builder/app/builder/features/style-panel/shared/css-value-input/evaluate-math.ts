export const evaluateMath = (expression: string) => {
  if (/^[\d\s.+*/-]+$/.test(expression) === false) {
    return;
  }
  try {
    // Eval is safe here because of the regex above
    const result = eval(`(${expression})`);
    if (typeof result === "number") {
      return result;
    }
  } catch {
    return;
  }
};
