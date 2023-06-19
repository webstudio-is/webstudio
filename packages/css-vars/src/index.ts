/**
 * To reduce probability of intersection with any existing CSS variables
 */
const CSS_VARIABLE_POSTFIX = "-w7ovd";

const cssVarsSet = new Set<string>();

const define = <Name extends string>(name: Name) => {
  if (cssVarsSet.has(name)) {
    throw new Error(`Variable ${name} already defined`);
  }
  cssVarsSet.add(name);

  return `--${name}${CSS_VARIABLE_POSTFIX}` as const;
};

const use = (...args: string[]) => `var(${args.join(", ")})`;

export const cssVars = { define, use };
