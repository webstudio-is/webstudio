import { generate, parse } from "css-tree";
import { EditorState } from "@codemirror/state";
import { keymap } from "@codemirror/view";

export const declarationLineBreak = keymap.of([
  {
    key: "Enter",
    run(view) {
      const { from, to } = view.state.selection.main;
      const line = view.state.doc.lineAt(from);
      if (
        view.state.facet(EditorState.readOnly) ||
        from !== to ||
        from !== line.to ||
        line.text.trimEnd().endsWith(";")
      ) {
        return false;
      }
      let hasError = false;
      const ast = parse(line.text, {
        context: "declarationList",
        positions: true,
        onParseError: () => {
          hasError = true;
        },
      });
      const last = ast.children.last;
      if (
        hasError ||
        last?.type !== "Declaration" ||
        last.loc?.end.offset !== line.text.length ||
        generate(last.value).trim() === ""
      ) {
        return false;
      }
      view.dispatch({
        changes: { from, insert: ";\n" },
        selection: { anchor: from + 2 },
      });
      return true;
    },
  },
]);
