import { useMemo } from "react";
import { type Instance } from "@webstudio-is/sdk";
import { useDragData, useSelectedInstance } from "~/canvas/nano-values";
import { primitives } from "~/shared/component";
import { css as createCss, type CSS } from "~/shared/design-system";

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
  outline: "1px solid $blue10",
  outlineOffset: -1,
  ...componentTagStyle,
};

const defaultOutlineStyle = {
  outline: "1px dashed #555",
  outlineOffset: -1,
  "&:hover": hoverOutlineStyle,
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
  id: Instance["id"];
  component: Instance["component"];
  css: CSS;
};

export const useCss = ({ id, component, css }: UseCssProps): string => {
  const [dragData] = useDragData();
  const [selectedInstance] = useSelectedInstance();

  return useMemo(() => {
    let overrides: CSS = defaultOutlineStyle;

    if (selectedInstance?.id === id) {
      overrides = selectedOutlineStyle;
    }

    if (dragData !== undefined) {
      const primitive = primitives[component];
      if (dragData.id === id && primitive.canAcceptChild(dragData.component)) {
        overrides = dragOverOutlineStyle;
      }
    }

    return createCss(css)({ css: overrides });
  }, [dragData, selectedInstance, css]);
};
