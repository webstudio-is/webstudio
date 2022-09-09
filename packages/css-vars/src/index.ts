let counter = -1;

const define = <Name extends string>(name: Name) => {
  return `--${name}-${++counter}` as const;
};

type AppendString<
  TResult extends string,
  TDelimiter extends string,
  TNextPart extends string
> = TResult extends "" ? TNextPart : `${TResult}${TDelimiter}${TNextPart}`;

type Join<
  TInput extends readonly string[],
  TDelimiter extends string,
  TResult extends string = ""
> = TInput extends []
  ? TResult
  : TInput extends [string, ...infer Rest extends string[]]
  ? Join<Rest, TDelimiter, AppendString<TResult, TDelimiter, TInput[0]>>
  : never;

const use = <Args extends string[]>(...args: Args) => {
  return `var(${args.join(", ") as Join<Args, ", ">})` as const;
};

export const cssVars = { define, use };
