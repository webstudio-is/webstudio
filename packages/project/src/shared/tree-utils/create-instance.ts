import ObjectId from "bson-objectid";
import type { Instance } from "@webstudio-is/project-build";
import { getComponentMeta } from "@webstudio-is/react-sdk";

export const createInstanceId = () => {
  return ObjectId().toString();
};

export const createInstance = ({
  component,
  id,
  children,
}: {
  component: Instance["component"];
  id?: Instance["id"];
  children?: Instance["children"];
}): Instance => {
  const componentMeta = getComponentMeta(component);
  return {
    type: "instance",
    component,
    id: id === undefined ? createInstanceId() : id,
    children:
      children === undefined
        ? componentMeta?.children?.map((value) => ({ type: "text", value })) ??
          []
        : children,
  };
};
