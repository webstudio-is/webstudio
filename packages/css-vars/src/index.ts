let counter = -1;

const define = <Name extends string>(name: Name) => {
  return `--${name}-${++counter}` as const;
};

const use = <Args extends string[]>(...args: Args) => {
  type JoinedArgs = `${typeof args[0]}, ${typeof args[1]}, ${typeof args[2]}`;
  return `var(${args.join(", ") as JoinedArgs})` as const;
};

export const cssVars = { define, use };
