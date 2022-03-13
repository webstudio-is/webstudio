import ObjectId from "bson-objectid";
import { type Style, type Instance } from "@webstudio-is/sdk";
import { primitives } from "~/shared/component";

export const createInstance = ({
  component,
  id,
  children,
  style,
}: {
  component: Instance["component"];
  id?: Instance["id"];
  children?: Instance["children"];
  style?: Style;
}): Instance => {
  const primitive = primitives[component];
  return {
    component,
    id: id === undefined ? ObjectId().toString() : id,
    style: style ?? {},
    children:
      children === undefined
        ? "children" in primitive
          ? primitive.children
          : []
        : children,
  };
};
