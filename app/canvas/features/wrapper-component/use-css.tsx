import { useMemo } from "react";
import { type Instance, css as createCss, type CSS } from "@webstudio-is/sdk";
import { useDropData, useSelectedInstance } from "~/canvas/shared/nano-values";
import { primitives } from "~/shared/component";

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

export const useCss = ({ instance, css }: UseCssProps): string => {
  const [dropData] = useDropData();
  const [selectedInstance] = useSelectedInstance();

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

    return createCss(css)({ css: overrides });
  }, [dropData, selectedInstance, css, instance]);
};
