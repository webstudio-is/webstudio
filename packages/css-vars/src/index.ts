let counter = -1;

const define = (name: string) => {
  return `--${name}-${++counter}`;
};

const use = (variable: string, ...fallbacks: Array<string>) => {
  return `var(${variable}, ${fallbacks})`;
};

export const cssVars = { define, use };
