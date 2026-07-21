import type {
  Completion,
  CompletionContext,
  CompletionResult,
} from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode } from "@lezer/common";
import type { BuilderAssetFieldCatalog } from "@webstudio-is/sdk";

export type GroqCompletionConfiguration = {
  catalog?: BuilderAssetFieldCatalog;
  parameterNames?: readonly string[];
  resourceFieldPaths?: ReadonlySet<string>;
};

const standardAssetFields = [
  "_id",
  "_type",
  "name",
  "path",
  "key",
  "folderId",
  "extension",
  "mimeType",
  "size",
  "revision",
  "contentRef",
  "properties",
  "excerpt",
] as const;

const groqVocabulary: Completion[] = [
  { label: "asc", type: "keyword", detail: "Ascending order" },
  { label: "desc", type: "keyword", detail: "Descending order" },
  { label: "in", type: "keyword", detail: "Membership operator" },
  { label: "match", type: "keyword", detail: "Pattern-match operator" },
  { label: "true", type: "keyword" },
  { label: "false", type: "keyword" },
  { label: "null", type: "keyword" },
  { label: "coalesce()", type: "function", apply: "coalesce()" },
  { label: "count()", type: "function", apply: "count()" },
  { label: "defined()", type: "function", apply: "defined()" },
  { label: "lower()", type: "function", apply: "lower()" },
  { label: "now()", type: "function", apply: "now()" },
  { label: "order()", type: "function", apply: "order()" },
  { label: "round()", type: "function", apply: "round()" },
  { label: "string()", type: "function", apply: "string()" },
  { label: "upper()", type: "function", apply: "upper()" },
];

// Match dotted paths and JSON-quoted bracket segments, including incomplete
// segments while the user is typing (for example `properties["seo`).
const groqFieldPath =
  /(?:[A-Za-z_][A-Za-z0-9_]*)(?:(?:\.[A-Za-z_][A-Za-z0-9_]*)|(?:\[\])|(?:\["(?:[^"\\]|\\.)*(?:"\])?))*[.\[]?$/;
const validGroqFieldPath = new RegExp(`^${groqFieldPath.source}`);

const getSyntaxContext = (context: CompletionContext) => {
  const names: string[] = [];
  let node: SyntaxNode | null = syntaxTree(context.state).resolveInner(
    context.pos,
    -1
  );
  while (node !== null) {
    names.push(node.name);
    node = node.parent;
  }
  return names;
};

const getFieldCompletions = ({
  catalog,
  resourceFieldPaths,
}: GroqCompletionConfiguration): Completion[] => {
  const completions = new Map<string, Completion>();
  for (const path of standardAssetFields) {
    completions.set(path, {
      label: path,
      type: "property",
      detail: "Asset field",
      boost: resourceFieldPaths?.has(path) ? 20 : 10,
    });
  }
  for (const [path, field] of Object.entries(catalog?.fields ?? {})) {
    const qualifiers = [
      field.types.join(" | "),
      ...(field.optional ? ["optional"] : []),
      ...(field.mixed ? ["mixed types"] : []),
    ];
    completions.set(path, {
      label: path,
      type: "property",
      detail: qualifiers.join(" · "),
      boost: resourceFieldPaths?.has(path) ? 30 : 15,
      info: `${field.occurrences} observed document${field.occurrences === 1 ? "" : "s"}`,
    });
  }
  return Array.from(completions.values());
};

export const createGroqCompletionSource =
  (configuration: GroqCompletionConfiguration = {}) =>
  (context: CompletionContext): CompletionResult | null => {
    const parameterToken = context.matchBefore(/\$[A-Za-z0-9_]*/);
    const fieldToken = context.matchBefore(groqFieldPath);
    const token = parameterToken ?? fieldToken;
    if (token === null && context.explicit === false) {
      return null;
    }
    const text = token?.text ?? "";
    if (parameterToken !== null) {
      return {
        from: token?.from ?? context.pos,
        options: (configuration.parameterNames ?? []).map((name) => ({
          label: `$${name}`,
          type: "variable",
          detail: "Runtime parameter",
        })),
        validFor: /^\$[A-Za-z0-9_]*$/,
      };
    }

    const syntaxContext = getSyntaxContext(context);
    const insideString = syntaxContext.includes("String");
    const insideBracketAttribute =
      text.includes('["') && syntaxContext.includes("DoubleString");
    if (insideString && insideBracketAttribute === false) {
      return null;
    }
    const inFieldPath =
      text.includes(".") ||
      text.includes("[") ||
      syntaxContext.includes("DotAccess");
    const fields = getFieldCompletions(configuration);
    return {
      from: token?.from ?? context.pos,
      options: inFieldPath ? fields : [...fields, ...groqVocabulary],
      validFor: validGroqFieldPath,
    };
  };
