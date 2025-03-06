import { useMemo, useRef, type ComponentProps, type ReactNode } from "react";
import { matchSorter, type RankingInfo } from "match-sorter";
import { EditorView, keymap, tooltips } from "@codemirror/view";
import { css } from "@codemirror/lang-css";
import {
  autocompletion,
  completionKeymap,
  type CompletionSource,
} from "@codemirror/autocomplete";
import { parseCss } from "@webstudio-is/css-data";
import { css as style } from "@webstudio-is/design-system";
import type { CssProperty, StyleValue } from "@webstudio-is/css-engine";
import {
  EditorContent,
  EditorDialog,
  EditorDialogButton,
  EditorDialogControl,
  getMinMaxHeightVars,
} from "~/builder/shared/code-editor-base";
import { $availableVariables } from "./model";

export const parseCssFragment = (
  css: string,
  fallbacks: string[]
): Map<CssProperty, StyleValue> => {
  let parsed = parseCss(`.styles{${css}}`);
  if (parsed.length === 0) {
    for (const fallbackProperty of fallbacks) {
      parsed = parseCss(`.styles{${fallbackProperty}: ${css}}`);
      parsed = parsed.filter((styleDecl) => styleDecl.value.type !== "invalid");
      if (parsed.length > 0) {
        break;
      }
    }
  }
  return new Map(
    parsed.map((styleDecl) => [styleDecl.property, styleDecl.value])
  );
};

const compareVariables = (left: RankingInfo, right: RankingInfo) => {
  return left.rankedValue.localeCompare(right.rankedValue, undefined, {
    numeric: true,
  });
};

const scopeCompletionSource: CompletionSource = (context) => {
  const word = context.matchBefore(/[-\w()]+/);
  if (word === null || (word.from === word.to && false === context.explicit)) {
    return null;
  }
  const search = word.text;
  const availableVariables = $availableVariables.get();
  const options = availableVariables.map((varValue) => ({
    label: `var(--${varValue.value})`,
    displayLabel: `--${varValue.value}`,
  }));
  const matches = matchSorter(options, search, {
    keys: ["label"],
    baseSort: compareVariables,
  });
  return {
    from: word.from,
    to: word.to,
    filter: false,
    options: matches,
  };
};

const wrapperStyle = style({
  position: "relative",
  ...getMinMaxHeightVars({ minHeight: "40px", maxHeight: "80px" }),
});

export const CssFragmentEditorContent = ({
  onKeyDown,
  ...props
}: ComponentProps<typeof EditorContent> & {
  onKeyDown?: (event: KeyboardEvent) => void;
}) => {
  const onKeyDownRef = useRef(onKeyDown);
  onKeyDownRef.current = onKeyDown;
  const extensions = useMemo(() => {
    return [
      css(),
      // render autocomplete in body
      // to prevent popover scroll overflow
      tooltips({ parent: document.body }),
      autocompletion({
        override: [scopeCompletionSource],
        icons: false,
      }),
      keymap.of([...completionKeymap]),
      EditorView.domEventHandlers({
        keydown(event) {
          onKeyDownRef.current?.(event);
        },
      }),
    ];
  }, []);
  return <EditorContent extensions={extensions} {...props} />;
};

export const CssFragmentEditor = ({
  content,
  onOpenChange,
}: {
  content: ReactNode;
  onOpenChange?: (newOpen: boolean) => void;
}) => {
  return (
    <div className={wrapperStyle()}>
      <EditorDialogControl>
        {content}
        <EditorDialog
          onOpenChange={onOpenChange}
          title="CSS Value"
          content={content}
        >
          <EditorDialogButton />
        </EditorDialog>
      </EditorDialogControl>
    </div>
  );
};
