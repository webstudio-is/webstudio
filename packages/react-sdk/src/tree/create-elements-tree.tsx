import {
  Fragment,
  type ForwardRefExoticComponent,
  type RefAttributes,
  type ReactNode,
} from "react";
import type { Instance, Instances } from "@webstudio-is/sdk";
import type { Components } from "../components/components-utils";
import { type Params, ReactSdkContext } from "../context";
import type { WebstudioComponentProps } from "./webstudio-component";
import type { ImageLoader } from "@webstudio-is/image";

type InstanceSelector = Instance["id"][];

export const createElementsTree = ({
  renderer,
  assetBaseUrl,
  imageBaseUrl,
  imageLoader,
  instances,
  rootInstanceId,
  Component,
  components,
  scripts,
}: Params & {
  instances: Instances;
  imageLoader: ImageLoader;
  rootInstanceId: Instance["id"];

  Component: ForwardRefExoticComponent<
    WebstudioComponentProps & RefAttributes<HTMLElement>
  >;
  components: Components;
  scripts?: ReactNode;
}) => {
  const rootInstance = instances.get(rootInstanceId);
  if (rootInstance === undefined) {
    return null;
  }

  const rootInstanceSelector = [rootInstanceId];
  const children = createInstanceChildrenElements({
    instances,
    instanceSelector: rootInstanceSelector,
    Component,
    children: rootInstance.children,
    components,
  });
  const root = createInstanceElement({
    Component,
    instance: rootInstance,
    instanceSelector: rootInstanceSelector,
    children: [
      <Fragment key="children">
        {children}
        {scripts}
      </Fragment>,
    ],
    components,
  });
  return (
    <ReactSdkContext.Provider
      value={{
        renderer,
        imageLoader,
        pagesPaths: new Set(),
        assetBaseUrl,
        imageBaseUrl,
      }}
    >
      {root}
    </ReactSdkContext.Provider>
  );
};

const createInstanceChildrenElements = ({
  instances,
  instanceSelector,
  children,
  Component,
  components,
}: {
  instances: Instances;
  instanceSelector: InstanceSelector;
  children: Instance["children"];
  Component: ForwardRefExoticComponent<
    WebstudioComponentProps & RefAttributes<HTMLElement>
  >;
  components: Components;
}) => {
  const elements = [];
  for (const child of children) {
    if (child.type === "text") {
      elements.push(child.value);
      continue;
    }
    const childInstance = instances.get(child.value);
    if (childInstance === undefined) {
      continue;
    }
    const childInstanceSelector = [child.value, ...instanceSelector];
    const children = createInstanceChildrenElements({
      instances,
      instanceSelector: childInstanceSelector,
      children: childInstance.children,
      Component,
      components,
    });
    const element = createInstanceElement({
      instance: childInstance,
      instanceSelector: childInstanceSelector,
      Component,
      children,
      components,
    });
    elements.push(element);
  }
  return elements;
};

const createInstanceElement = ({
  Component,
  instance,
  instanceSelector,
  children = [],
  components,
}: {
  instance: Instance;
  instanceSelector: InstanceSelector;
  Component: ForwardRefExoticComponent<
    WebstudioComponentProps & RefAttributes<HTMLElement>
  >;
  children?: Array<JSX.Element | string>;
  components: Components;
}) => {
  return (
    <Component
      key={instance.id}
      instance={instance}
      instanceSelector={instanceSelector}
      components={components}
    >
      {children}
    </Component>
  );
};
