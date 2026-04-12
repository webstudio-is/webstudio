import { useMemo, useRef, type ComponentProps, type ReactNode } from "react";
import { matchSorter, type RankingInfo } from "match-sorter";
import { EditorView, keymap, tooltips } from "@codemirror/view";
import { css } from "@codemirror/lang-css";
import {
  autocompletion,
  completionKeymap,
  type CompletionSource,
} from "@codemirror/autocomplete";
import { parseCss, shorthandProperties } from "@webstudio-is/css-data";
import { css as style, type CSS } from "@webstudio-is/design-system";
import type { CssProperty, StyleValue } from "@webstudio-is/css-engine";
import {
  EditorContent,
  EditorDialog,
  EditorDialogButton,
  EditorDialogControl,
  getCodeEditorCssVars,
} from "~/shared/code-editor-base";
import { $availableVariables, $cssVarsMap } from "./model";

type ShorthandProperty = (typeof shorthandProperties)[number];

export { getCodeEditorCssVars };

export const parseCssFragment = (
  css: string,
  fallbacks: (CssProperty | ShorthandProperty)[]
): { styles: Map<CssProperty, StyleValue>; errors: string[] } => {
  const cssVars = $cssVarsMap.get();
  const { styles: firstStyles, errors: firstErrors } = parseCss(
    `.styles{${css}}`,
    cssVars
  );
  let parsed = firstStyles;
  let errors = firstErrors;
  if (parsed.length === 0) {
    for (const fallbackProperty of fallbacks) {
      const result = parseCss(`.styles{${fallbackProperty}: ${css}}`, cssVars);
      parsed = result.styles.filter(
        (styleDecl) => styleDecl.value.type !== "invalid"
      );
      // Only use fallback errors when firstErrors is empty: the initial
      // full-declaration parse produces the most relevant diagnostic (e.g.
      // "background was not applied because --x could not be resolved").
      // Fallback attempts with a forced property prefix often produce silent
      // failures with no errors at all, which would otherwise discard the
      // original diagnostic.
      if (errors.length === 0 && result.errors.length > 0) {
        errors = result.errors;
      }
      if (parsed.length > 0) {
        break;
      }
    }
  }
  return {
    styles: new Map(
      parsed.map((styleDecl) => [styleDecl.property, styleDecl.value])
    ),
    errors,
  };
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
  ...getCodeEditorCssVars({ minHeight: "3lh", maxHeight: "6lh" }),
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
  css,
}: {
  content: ReactNode;
  onOpenChange?: (newOpen: boolean) => void;
  css?: CSS;
}) => {
  return (
    <div className={wrapperStyle({ css })}>
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
