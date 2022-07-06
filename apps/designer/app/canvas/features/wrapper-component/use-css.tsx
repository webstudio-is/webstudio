import { useEffect, useMemo, useState } from "react";
import {
  type Instance,
  css as createCss,
  type CSS,
  useSubscribe,
  toValue,
} from "@webstudio-is/sdk";
import { type StyleUpdates } from "apps/designer/app/shared/canvas-components";

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

  useSubscribe<string, StyleUpdates>(
    `previewStyle:${instance.id}`,
    ({ updates }) => {
      setPreviewCss(updates);
    }
  );

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
const rootElement = "body > div";

const defaultStyle = {
  "&": {
    // When double clicking into an element to edit text, it should not select the word.
    userSelect: "none",
  },
  [`&:not(${voidElements}):not(${rootElement}):empty`]: {
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
    const overrides: CSS = { ...defaultStyle };
    for (const update of previewCss) {
      if (update.value === undefined) continue;
      overrides[update.property as string] = toValue(update.value);
    }

    return createCss(css)({ css: overrides });
  }, [css, previewCss]);
};
