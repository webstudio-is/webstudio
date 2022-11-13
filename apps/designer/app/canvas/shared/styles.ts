import store from "immerhin";
import { useSubscribe } from "~/shared/pubsub";
import { setInstanceStyleMutable } from "~/shared/tree-utils";
import { useSelectedInstance } from "./nano-states";
import { rootInstanceContainer } from "~/shared/nano-states";
import {
  type StyleValue,
  toValue,
  toVarNamespace,
} from "@webstudio-is/react-sdk";
import { globalCss } from "@webstudio-is/design-system";

const setCssVar = (id: string, property: string, value?: StyleValue) => {
  const customProperty = `--${toVarNamespace(id, property)}`;
  if (value === undefined) {
    document.body.style.removeProperty(customProperty);
    return;
  }
  document.body.style.setProperty(customProperty, toValue(value));
};

const useUpdateStyle = () => {
  const [selectedInstance] = useSelectedInstance();
  useSubscribe("updateStyle", ({ id, updates, breakpoint }) => {
    // Only update styles if they match the selected instance
    // It can potentially happen that we selected a difference instance right after we changed the style in style panel.
    if (id !== selectedInstance?.id) return;

    for (const update of updates) {
      setCssVar(id, update.property, undefined);
    }

    store.createTransaction([rootInstanceContainer], (rootInstance) => {
      if (rootInstance === undefined) {
        return;
      }
      setInstanceStyleMutable(rootInstance, id, updates, breakpoint);
    });
  });
};

const usePreviewStyle = () => {
  useSubscribe("previewStyle", ({ id, updates }) => {
    for (const update of updates) {
      setCssVar(id, update.property, update.value);
    }
  });
};

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
const wrapperComponentGlobalStyles = globalCss(styles);

export const useManageStyles = () => {
  wrapperComponentGlobalStyles();
  useUpdateStyle();
  usePreviewStyle();
};
