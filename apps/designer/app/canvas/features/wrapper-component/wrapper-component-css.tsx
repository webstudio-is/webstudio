import { globalCss } from "@webstudio-is/design-system";

const voidElements =
  "area, base, br, col, embed, hr, img, input, link, meta, source, track, wbr";

// Helper styles on for canvas in design mode
const styles = {
  "[data-ws-component]": {
    // When double clicking into an element to edit text, it should not select the word.
    userSelect: "none",
  },
  [`[data-ws-component]:not(${voidElements}):not(body):empty`]: {
    outline: "1px dashed #555",
    outlineOffset: -1,
    paddingTop: 50,
    paddingRight: 50,
  },
  "[data-ws-component][contenteditable], [data-ws-component]:focus": {
    outline: 0,
  },
  "[data-ws-component][contenteditable]": {
    boxShadow: "0 0 0px 4px rgb(36 150 255 / 20%)",
  },
  // Text Editor wraps each line into a p, so we need to make sure there is no jump between regular rendering and editing
  "[data-ws-component][contenteditable] p": {
    margin: 0,
  },
};

// @todo rewrite to use css engine and remove stitches from canvas entirely
export const wrapperComponentGlobalStyles = globalCss(styles);
