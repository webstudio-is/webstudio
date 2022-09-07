let counter = -1;

const define = <Name extends string>(name: Name) => {
  return `--${name}-${++counter}` as const;
};

type Cast<T1, T2> = T1 extends T2 ? T1 : T2;

type Join<T extends readonly string[], D extends string> = T extends []
  ? ""
  : T extends [string]
  ? T[0]
  : T extends [string, ...infer Rest]
  ? `${T[0]}${D}${Join<Cast<Rest, string[]>, D>}`
  : never;

const use = <Args extends string[]>(...args: Args) => {
  return `var(${args.join(", ") as Join<Args, ", ">})` as const;
};

export const cssVars = { define, use };
