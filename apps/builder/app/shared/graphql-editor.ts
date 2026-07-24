import { snippet, type CompletionContext } from "@codemirror/autocomplete";
import type { EditorState } from "@codemirror/state";
import type { StringStream } from "@codemirror/language";
import type { Diagnostic } from "@codemirror/lint";
import type { AssetGraphqlEditor } from "@webstudio-is/asset-resource/graphql-editor";
import { onlineParser } from "graphql-language-service";

const parser = onlineParser();
type GraphqlParserState = ReturnType<typeof parser.startState>;

const copyParserState = (state: GraphqlParserState): GraphqlParserState => ({
  ...state,
  ...(state.levels === undefined ? {} : { levels: [...state.levels] }),
  prevState:
    state.prevState === null || state.prevState === undefined
      ? state.prevState
      : copyParserState(state.prevState),
});

const toCharacterStream = (stream: StringStream) => ({
  getStartOfToken: () => stream.start,
  getCurrentPosition: () => stream.pos,
  eol: () => stream.eol(),
  sol: () => stream.sol(),
  peek: () => stream.peek() ?? null,
  next: () => stream.next() ?? "",
  eat: (pattern: string | RegExp | ((character: string) => boolean)) =>
    stream.eat(pattern),
  eatWhile: (pattern: string | RegExp | ((character: string) => boolean)) =>
    stream.eatWhile(pattern),
  eatSpace: () => stream.eatSpace(),
  skipToEnd: () => stream.skipToEnd(),
  skipTo: (position: number) => {
    stream.pos = position;
  },
  match: (
    pattern: string | RegExp,
    consume?: boolean | null,
    caseFold?: boolean | null
  ) => stream.match(pattern, consume ?? true, caseFold ?? false) ?? false,
  backUp: (count: number) => stream.backUp(count),
  column: () => stream.column(),
  indentation: () => stream.indentation(),
  current: () => stream.current(),
});

export const graphqlStreamParser = {
  name: "graphql",
  startState: parser.startState,
  copyState: copyParserState,
  // Both editors expose the same stream protocol; the language service types
  // its argument as its concrete implementation rather than that protocol.
  token: (stream: StringStream, state: GraphqlParserState) => {
    const style = parser.token(toCharacterStream(stream) as never, state);
    return style === "ws"
      ? null
      : style === "invalidchar"
        ? "invalid"
        : (style ?? null);
  },
};

const positionToOffset = (
  state: EditorState,
  position: { line: number; character: number }
) => {
  const line = state.doc.line(
    Math.min(Math.max(position.line + 1, 1), state.doc.lines)
  );
  return Math.min(line.from + position.character, line.to);
};

export const getGraphqlDiagnostics = (
  state: EditorState,
  editor?: AssetGraphqlEditor
): Diagnostic[] =>
  (editor?.diagnostics(state.doc.toString()) ?? []).map((diagnostic) => ({
    from: positionToOffset(state, diagnostic.range.start),
    to: positionToOffset(state, diagnostic.range.end),
    severity:
      diagnostic.severity === 1
        ? "error"
        : diagnostic.severity === 2
          ? "warning"
          : "info",
    message: diagnostic.message,
  }));

export const lspSnippetToCodeMirror = (value: string) => {
  let converted = "";
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== "$" || /[0-9]/.test(value[index + 1]) === false) {
      converted += value[index];
      continue;
    }
    let placeholder = "";
    while (/[0-9]/.test(value[index + 1])) {
      index += 1;
      placeholder += value[index];
    }
    converted += `\${${placeholder}}`;
  }
  return converted;
};

export const createGraphqlCompletionSource =
  (editor?: AssetGraphqlEditor) => (context: CompletionContext) => {
    if (editor === undefined) {
      return null;
    }
    const line = context.state.doc.lineAt(context.pos);
    const suggestions = editor.completions(context.state.doc.toString(), {
      line: line.number - 1,
      character: context.pos - line.from,
    });
    if (suggestions.length === 0 && context.explicit === false) {
      return null;
    }
    const token = context.matchBefore(/\$?[_A-Za-z][_0-9A-Za-z]*/);
    return {
      from: token?.from ?? context.pos,
      options: suggestions.map((suggestion) => ({
        label: suggestion.label,
        type:
          suggestion.kind === 6
            ? "variable"
            : suggestion.kind === 13 || suggestion.kind === 20
              ? "enum"
              : suggestion.kind === 5 || suggestion.kind === 10
                ? "property"
                : "text",
        detail: suggestion.detail,
        info:
          typeof suggestion.documentation === "string"
            ? suggestion.documentation
            : undefined,
        apply:
          suggestion.insertTextFormat === 2
            ? snippet(
                lspSnippetToCodeMirror(
                  suggestion.insertText ?? suggestion.label
                )
              )
            : (suggestion.insertText ?? suggestion.label),
      })),
      validFor: /^\$?[_0-9A-Za-z]*$/,
    };
  };
