import { type Options, useHotkeys } from "react-hotkeys-hook";
import store from "immerhin";

export const shortcuts = {
  esc: "esc",
} as const;

export const options: Options = {
  enableOnFormTags: true,
};

export const useSharedShortcuts = ({
  source,
}: {
  source: "canvas" | "builder";
}) => {
  useHotkeys(
    // safari use cmd+z to reopen closed tabs so fallback to ctrl
    "meta+z, ctrl+z",
    () => store.undo(),
    {
      // prevents undoing when user is editing text in a control on style panel etc.
      enableOnFormTags: source === "canvas",
      enableOnContentEditable: false,
    },
    []
  );

  useHotkeys(
    // safari use cmd+shift+z to close reopened tabs so fallback to ctrl
    "meta+shift+z, ctrl+shift+z",
    () => store.redo(),
    {
      // prevents undoing when user is editing text in a control on style panel etc.
      enableOnFormTags: source === "canvas",
      enableOnContentEditable: false,
    },
    []
  );
};
