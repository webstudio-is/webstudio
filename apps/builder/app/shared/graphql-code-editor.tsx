import { forwardRef, useMemo, type ComponentProps } from "react";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import {
  bracketMatching,
  indentOnInput,
  StreamLanguage,
} from "@codemirror/language";
import { linter } from "@codemirror/lint";
import {
  highlightActiveLine,
  highlightSpecialChars,
  keymap,
  tooltips,
} from "@codemirror/view";
import type { AssetGraphqlEditor } from "@webstudio-is/asset-resource/graphql-editor";
import { CodeEditor } from "./code-editor";
import {
  createGraphqlCompletionSource,
  getGraphqlDiagnostics,
  graphqlStreamParser,
} from "./graphql-editor";

const graphqlLanguage = StreamLanguage.define(graphqlStreamParser);

export const getGraphqlExtensions = (editor?: AssetGraphqlEditor) => [
  highlightActiveLine(),
  highlightSpecialChars(),
  indentOnInput(),
  graphqlLanguage,
  bracketMatching(),
  closeBrackets(),
  tooltips({ parent: document.body }),
  autocompletion({
    icons: false,
    override: [createGraphqlCompletionSource(editor)],
  }),
  linter((view) => getGraphqlDiagnostics(view.state, editor)),
  keymap.of([
    {
      key: "Shift-Alt-f",
      run: (view) => {
        if (editor === undefined) {
          return false;
        }
        const source = view.state.doc.toString();
        const formatted = editor.format(source);
        if (formatted === source) {
          return false;
        }
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: formatted },
        });
        return true;
      },
    },
    ...closeBracketsKeymap,
    ...completionKeymap,
  ]),
];

export const GraphqlCodeEditor = forwardRef<
  HTMLDivElement,
  Omit<ComponentProps<typeof CodeEditor>, "lang" | "languageExtensions"> & {
    graphqlEditor?: AssetGraphqlEditor;
  }
>(({ graphqlEditor, ...props }, ref) => {
  const languageExtensions = useMemo(
    () => getGraphqlExtensions(graphqlEditor),
    [graphqlEditor]
  );
  return (
    <CodeEditor {...props} ref={ref} languageExtensions={languageExtensions} />
  );
});
GraphqlCodeEditor.displayName = "GraphqlCodeEditor";

export default GraphqlCodeEditor;
