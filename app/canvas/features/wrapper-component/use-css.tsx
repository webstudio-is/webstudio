import { useEffect, useMemo, useState } from "react";
import {
  type Instance,
  css as createCss,
  type CSS,
  useSubscribe,
  toValue,
} from "@webstudio-is/sdk";
import { useDropData, useSelectedInstance } from "~/canvas/shared/nano-states";
import { primitives, type StyleUpdates } from "~/shared/component";

// @todo this doesn't work with the node at the top edge of the iframe, tag gets hidden.
const componentTagStyle = {
  "&::before": {
    display: "flex",
    content: "attr(data-label)",
    padding: "0 $1",
    marginTop: "-$4",
    height: "$4",
    position: "absolute",
    backgroundColor: "$blue10",
    color: "$loContrast",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "$1",
    lineHeight: 1,
    minWidth: "$6",
  },
};

const hoverOutlineStyle = {
  "&:hover": {
    outline: "1px solid $blue10",
    outlineOffset: -1,
    ...componentTagStyle,
  },
};

const emptyOutlineStyle = {
  "&:empty": {
    outline: "1px dashed #555",
    outlineOffset: -1,
  },
  ...hoverOutlineStyle,
};

const selectedOutlineStyle = {
  outline: "2px solid $blue10",
  outlineOffset: -2,
  ...componentTagStyle,
};

const dragOverOutlineStyle = {
  outline: "2px solid $blue10",
  outlineOffset: -2,
  ...componentTagStyle,
};

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
    // previewCss in deps leads to an infinite loop
    // eslint-disable-next-line  react-hooks/exhaustive-deps
  }, [css]);

  return previewCss;
};

export const useCss = ({ instance, css }: UseCssProps): string => {
  const [dropData] = useDropData();
  const [selectedInstance] = useSelectedInstance();
  const previewCss = usePreviewCss({ instance, css });

  return useMemo(() => {
    const primitive = primitives[instance.component];
    let overrides: CSS = hoverOutlineStyle;
    if (primitive.canAcceptChild()) {
      overrides = emptyOutlineStyle;
    }

    if (selectedInstance?.id === instance.id) {
      overrides = selectedOutlineStyle;
    }

    if (dropData !== undefined) {
      if (dropData.instance.id === instance.id && primitive.canAcceptChild()) {
        overrides = dragOverOutlineStyle;
      }
    }

    for (const update of previewCss) {
      // Delete ephemeral value
      if (update.value === undefined) {
        delete overrides[update.property];
        continue;
      }
      // @todo workaround for Expression produces a union type that is too complex to represent.
      overrides[update.property as string] = toValue(update.value);
    }

    return createCss(css)({ css: overrides });
  }, [dropData, selectedInstance, css, previewCss, instance]);
};
