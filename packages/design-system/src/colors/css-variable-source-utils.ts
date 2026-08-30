import { parse } from "@babel/parser";

export type CssVariableDeclaration = {
  name: `--${string}`;
  source: string;
};

export const parseCssVariableDeclarations = ({
  code,
  source,
}: {
  code: string;
  source: string;
}): CssVariableDeclaration[] => {
  const sourceFile = parse(code, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });
  const declarations: CssVariableDeclaration[] = [];

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
      return;
    }
    if (typeof value !== "object" || value === null) {
      return;
    }
    const node = value as Record<string, unknown>;
    if (
      node.type === "CallExpression" &&
      typeof node.callee === "object" &&
      node.callee !== null &&
      (node.callee as Record<string, unknown>).type === "Identifier" &&
      (node.callee as Record<string, unknown>).name === "declareCssVar"
    ) {
      const argument = Array.isArray(node.arguments)
        ? node.arguments[0]
        : undefined;
      if (
        typeof argument !== "object" ||
        argument === null ||
        (argument as Record<string, unknown>).type !== "StringLiteral" ||
        typeof (argument as Record<string, unknown>).value !== "string"
      ) {
        throw new Error(`${source}: declareCssVar() requires a string literal`);
      }
      const name = (argument as Record<string, unknown>).value as string;
      if (name.startsWith("--") === false) {
        throw new Error(`${source}: invalid CSS variable ${name}`);
      }
      declarations.push({
        name: name as `--${string}`,
        source,
      });
    }
    for (const [key, child] of Object.entries(node)) {
      if (key !== "loc" && key !== "start" && key !== "end") {
        visit(child);
      }
    }
  };

  visit(sourceFile);
  return declarations;
};

export const getUniqueCssVariableNames = ({
  declarations,
  reservedNames,
}: {
  declarations: CssVariableDeclaration[];
  reservedNames: ReadonlySet<string>;
}) => {
  const sources = new Map<string, string>();
  for (const { name, source } of declarations) {
    const existingSource = sources.get(name);
    if (existingSource !== undefined) {
      throw new Error(
        `Duplicate CSS variable declaration ${name}: ${existingSource} and ${source}`
      );
    }
    if (reservedNames.has(name)) {
      throw new Error(
        `CSS variable declaration ${name} in ${source} conflicts with colors.css`
      );
    }
    sources.set(name, source);
  }
  return [...sources.keys()].sort();
};
