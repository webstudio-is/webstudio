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

type UpdatesReset = Array<{
  property: string;
  value: undefined;
}>;

const usePreviewCss = ({ instance, css }: UseCssProps) => {
  const [previewCss, setPreviewCss] = useState<
    StyleUpdates["updates"] | UpdatesReset
  >([]);

  useSubscribe(`previewStyle:${instance.id}`, ({ updates }) => {
    setPreviewCss(updates);
  });

  // We are building a map for unsetting the ephemeral values we previously set for the preview
  useEffect(() => {
    const reset = previewCss.map(({ property }) => ({
      property,
      value: undefined,
    }));
    setPreviewCss(reset);
    // previewCss in deps leads to an infinite loop, css is like a cache key in this case,
    // as soon as `css` changes we can reset the preview
    // @todo need a more correct approach than this
    // eslint-disable-next-line  react-hooks/exhaustive-deps
  }, [css]);

  return previewCss;
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
  const previewCss = usePreviewCss({ instance, css });

  return useMemo(() => {
    for (const update of previewCss) {
      if (update.value === undefined) {
        continue;
      }
      const property = `--${toVarNamespace(instance, update.property)}`;
      document.body.style.setProperty(property, toValue(update.value));
    }

    return createCss(css)(defaultStyle);
  }, [css, previewCss]);
};
