import {
  autocompletion,
  type CompletionSource,
} from "@codemirror/autocomplete";
import { tooltips } from "@codemirror/view";

export const cssAutocomplete = (source: CompletionSource) => [
  // Keep suggestions visible outside floating panels and editor scroll areas.
  tooltips({ parent: document.body }),
  autocompletion({
    override: [source],
    icons: false,
    positionInfo: (_view, list, _option, info, space) => {
      const roomBelow = space.bottom - list.bottom;
      const roomAbove = list.top - space.top;
      return {
        style: "position: static",
        class:
          roomBelow >= info.bottom - info.top || roomBelow >= roomAbove
            ? "cm-completionInfo-below"
            : "cm-completionInfo-above",
      };
    },
  }),
];
