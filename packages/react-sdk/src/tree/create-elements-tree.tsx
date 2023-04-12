import { type ComponentProps, Fragment } from "react";
import type { ReadableAtom } from "nanostores";
import { Scripts, ScrollRestoration } from "@remix-run/react";
import type { Assets } from "@webstudio-is/asset-uploader";
import type {
  Instance,
  Instances,
  InstancesItem,
} from "@webstudio-is/project-build";
import type { GetComponent } from "../components/components-utils";
import { ReactSdkContext } from "../context";
import type { Pages, PropsByInstanceId } from "../props";
import type { WebstudioComponent } from "./webstudio-component";
import { SessionStoragePolyfill } from "./session-storage-polyfill";

type InstanceSelector = Instance["id"][];

export const createElementsTree = ({
  instances,
  rootInstanceId,
  sandbox,
  propsByInstanceIdStore,
  assetsStore,
  pagesStore,
  Component,
  getComponent,
}: {
  instances: Instances;
  rootInstanceId: Instance["id"];
  sandbox?: boolean;
  propsByInstanceIdStore: ReadableAtom<PropsByInstanceId>;
  assetsStore: ReadableAtom<Assets>;
  pagesStore: ReadableAtom<Pages>;
  Component: (props: ComponentProps<typeof WebstudioComponent>) => JSX.Element;
  getComponent: GetComponent;
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
    getComponent,
  });
  const root = createInstanceElement({
    Component,
    instance: rootInstance,
    instanceSelector: rootInstanceSelector,
    children: [
      <Fragment key="children">
        {children}
        {sandbox && <SessionStoragePolyfill />}
        <ScrollRestoration />
        <Scripts />
      </Fragment>,
    ],
    getComponent,
  });
  return (
    <ReactSdkContext.Provider
      value={{ propsByInstanceIdStore, assetsStore, pagesStore }}
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
  getComponent,
}: {
  instances: Instances;
  instanceSelector: InstanceSelector;
  children: InstancesItem["children"];
  Component: (props: ComponentProps<typeof WebstudioComponent>) => JSX.Element;
  getComponent: GetComponent;
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
      getComponent,
    });
    const element = createInstanceElement({
      instance: childInstance,
      instanceSelector: childInstanceSelector,
      Component,
      children,
      getComponent,
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
  getComponent,
}: {
  instance: InstancesItem;
  instanceSelector: InstanceSelector;
  Component: (props: ComponentProps<typeof WebstudioComponent>) => JSX.Element;
  children?: Array<JSX.Element | string>;
  getComponent: GetComponent;
}) => {
  return (
    <Component
      key={instance.id}
      instance={instance}
      instanceSelector={instanceSelector}
      getComponent={getComponent}
    >
      {children}
    </Component>
  );
};
