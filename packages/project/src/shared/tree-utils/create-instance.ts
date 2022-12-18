import ObjectId from "bson-objectid";
import { type Instance, getComponentMeta } from "@webstudio-is/react-sdk";
import { CssRule } from "@webstudio-is/css-data";

export const createInstanceId = () => {
  return ObjectId().toString();
};

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
  const componentMeta = getComponentMeta(component);
  return {
    type: "instance",
    component,
    id: id === undefined ? createInstanceId() : id,
    cssRules: cssRules ?? [],
    children:
      children === undefined
        ? componentMeta.children?.map((value) => ({ type: "text", value })) ??
          []
        : children,
  };
};
