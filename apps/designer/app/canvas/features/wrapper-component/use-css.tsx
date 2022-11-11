import { useEffect, useMemo, useState } from "react";
import {
  type Instance,
  css as createCss,
  type CSS,
  toValue,
  toVarNamespace,
} from "@webstudio-is/react-sdk";
import { useSubscribe } from "~/shared/pubsub";
import { type StyleUpdates } from "~/shared/canvas-components";

type UseCssProps = {
  instance: Instance;
  css: CSS;
};

const usePreviewCss = (instance: Instance) => {
  useSubscribe(`previewStyle:${instance.id}`, ({ updates }) => {
    for (const update of updates) {
      const property = `--${toVarNamespace(instance, update.property)}`;
      if (update.value === undefined) {
        document.body.style.removeProperty(property);
        continue;
      }
      document.body.style.setProperty(property, toValue(update.value));
    }
  });
};

const voidElements =
  "area, base, br, col, embed, hr, img, input, link, meta, source, track, wbr";

const defaultStyle = {
  "&": {
    // When double clicking into an element to edit text, it should not select the word.
    userSelect: "none",
  },
  [`&:not(${voidElements}):not(body):empty`]: {
    outline: "1px dashed #555",
    outlineOffset: -1,
    paddingTop: 50,
    paddingRight: 50,
  },
  "&[contenteditable], &:focus": {
    outline: 0,
  },
  "&[contenteditable]": {
    boxShadow: "0 0 0px 4px rgb(36 150 255 / 20%)",
  },
  // Text Editor wraps each line into a p, so we need to make sure there is no jump between regular rendering and editing
  "&[contenteditable] p": {
    margin: 0,
  },
};

export const useCss = ({ instance, css }: UseCssProps): string => {
  usePreviewCss(instance);
  return useMemo(() => createCss(css)(defaultStyle), [css]);
};
