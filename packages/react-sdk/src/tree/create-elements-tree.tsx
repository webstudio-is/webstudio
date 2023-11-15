import {
  Fragment,
  type ForwardRefExoticComponent,
  type ReactNode,
  type RefAttributes,
} from "react";
import type { Instance, Instances } from "@webstudio-is/sdk";
import type { Components } from "../components/components-utils";
import { type Params, ReactSdkContext } from "../context";
import type { ImageLoader } from "@webstudio-is/image";

type InstanceSelector = Instance["id"][];

export type WebstudioComponentProps = {
  instance: Instance;
  instanceSelector: Instance["id"][];
  children: ReactNode;
  components: Components;
};

export const createElementsTree = ({
  renderer,
  assetBaseUrl,
  imageBaseUrl,
  imageLoader,
  instances,
  rootInstanceId,
  Component,
  components,
}: Params & {
  instances: Instances;
  imageLoader: ImageLoader;
  rootInstanceId: Instance["id"];

  Component: ForwardRefExoticComponent<
    WebstudioComponentProps & RefAttributes<HTMLElement>
  >;
  components: Components;
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
    children,
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

const renderText = (text: string): Array<JSX.Element> => {
  const lines = text.split("\n");
  return lines.map((line, index) => (
    <Fragment key={index}>
      {line}
      {index < lines.length - 1 && <br />}
    </Fragment>
  ));
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
  const elements: ReactNode[] = [];
  for (const child of children) {
    if (child.type === "text") {
      elements.push(renderText(child.value));
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
  // let empty children be coalesced with fallback
  if (elements.length === 0) {
    return;
  }
  return elements;
};

const createInstanceElement = ({
  Component,
  instance,
  instanceSelector,
  children,
  components,
}: {
  instance: Instance;
  instanceSelector: InstanceSelector;
  Component: ForwardRefExoticComponent<
    WebstudioComponentProps & RefAttributes<HTMLElement>
  >;
  children?: ReactNode;
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
