import { useEffect, useMemo, useState } from "react";
import {
  type Instance,
  css as createCss,
  type CSS,
  useSubscribe,
  toValue,
} from "@webstudio-is/sdk";
import { type StyleUpdates } from "~/shared/canvas-components";

type UseCssProps = {
  instance: Instance;
  css: CSS;
};

type UpdatesReset = Array<{
  property: string;
  value: undefined;
}>;

const usePreviewCss = (instance: Instance) => {
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
  }, [previewCss]);

  return previewCss;
};

const emptyStyle = {
  "&:empty": {
    outline: "1px dashed #555",
    outlineOffset: -1,
  },
}

export const useCss = ({ instance, css }: UseCssProps): string => {
  const previewCss = usePreviewCss(instance);

  return useMemo(() => {
    const overrides: CSS = {...emptyStyle};
    for (const update of previewCss) {
      if (update.value === undefined) continue;
      overrides[update.property as string] = toValue(update.value);
    }

    return createCss(css)({ css: overrides });
  }, [css, previewCss]);
};
