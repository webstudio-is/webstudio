import ObjectId from "bson-objectid";
import { type CssRule, type Instance } from "@webstudio-is/react-sdk";
import { primitives } from "~/shared/canvas-components";

export const createInstance = ({
  component,
  id,
  children,
  cssRules,
}: {
  component: Instance["component"];
  id?: Instance["id"];
  children?: Instance["children"];
  cssRules?: Array<CssRule>;
}): Instance => {
  const primitive = primitives[component];
  return {
    component,
    id: id === undefined ? ObjectId().toString() : id,
    cssRules: cssRules ?? [],
    children:
      children === undefined
        ? "children" in primitive
          ? primitive.children
          : []
        : children,
  };
};
