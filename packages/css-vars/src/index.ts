let counter = -1;

const define = (name: string) => {
  return `--${name}-${++counter}` as const;
};

const use = (variable: string, ...fallbacks: Array<string>) => {
  return `var(${variable}, ${fallbacks})` as const;
};

export const cssVars = { define, use };
