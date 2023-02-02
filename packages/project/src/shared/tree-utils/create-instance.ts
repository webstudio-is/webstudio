import { nanoid } from "nanoid";
import type { Instance } from "@webstudio-is/project-build";
import { getComponentMeta } from "@webstudio-is/react-sdk";

export const createInstanceId = () => {
  return nanoid();
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
    id: id ?? createInstanceId(),
    children:
      children === undefined
        ? componentMeta?.children?.map((value) => ({ type: "text", value })) ??
          []
        : children,
  };
};
