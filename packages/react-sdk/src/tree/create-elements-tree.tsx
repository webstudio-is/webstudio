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
  const root = createInstanceElement({
    Component,
    instance: rootInstance,
    instanceSelector: rootInstanceSelector,
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
        resources: {},
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

export const createInstanceChildrenElements = ({
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
    if (child.type === "expression") {
      continue;
    }
    if (child.type === "id") {
      const childInstance = instances.get(child.value);
      if (childInstance === undefined) {
        continue;
      }
      const childInstanceSelector = [child.value, ...instanceSelector];
      const element = createInstanceElement({
        instance: childInstance,
        instanceSelector: childInstanceSelector,
        Component,
        components,
      });
      elements.push(element);
      continue;
    }
    child satisfies never;
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
  components,
}: {
  instance: Instance;
  instanceSelector: InstanceSelector;
  Component: ForwardRefExoticComponent<
    WebstudioComponentProps & RefAttributes<HTMLElement>
  >;
  components: Components;
}) => {
  return (
    <Component
      key={instance.id}
      instance={instance}
      instanceSelector={instanceSelector}
      components={components}
    />
  );
};
