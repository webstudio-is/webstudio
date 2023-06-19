const WEBSTUDIO_CSS_VARIABLE_POSTFIX = "-webstudio-variable";
const cssVarsSet = new Set<string>();
const define = <Name extends string>(name: Name) => {
  if (cssVarsSet.has(name)) {
    throw new Error(`Variable ${name} already defined`);
  }
  cssVarsSet.add(name);

  return `--${name}${WEBSTUDIO_CSS_VARIABLE_POSTFIX}` as const;
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
