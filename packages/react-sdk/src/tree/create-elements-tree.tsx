import { type ComponentProps, Fragment } from "react";
import type { ReadableAtom } from "nanostores";
import { Scripts, ScrollRestoration } from "@remix-run/react";
import type { Instance } from "@webstudio-is/project-build";
import type { GetComponent } from "../components/components-utils";
import { ReactSdkContext } from "../context";
import type { Assets, PropsByInstanceId } from "../props";
import type { WebstudioComponent } from "./webstudio-component";
import { SessionStoragePolyfill } from "./session-storage-polyfill";

type InstanceSelector = Instance["id"][];

export const createElementsTree = ({
  sandbox,
  instance,
  propsByInstanceIdStore,
  assetsStore,
  Component,
  getComponent,
}: {
  sandbox?: boolean;
  instance: Instance;
  propsByInstanceIdStore: ReadableAtom<PropsByInstanceId>;
  assetsStore: ReadableAtom<Assets>;
  Component: (props: ComponentProps<typeof WebstudioComponent>) => JSX.Element;
  getComponent: GetComponent;
}) => {
  const rootInstanceSelector = [instance.id];
  const children = createInstanceChildrenElements({
    instanceSelector: rootInstanceSelector,
    Component,
    children: instance.children,
    getComponent,
  });
  const root = createInstanceElement({
    Component,
    instance,
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
    <ReactSdkContext.Provider value={{ propsByInstanceIdStore, assetsStore }}>
      {root}
    </ReactSdkContext.Provider>
  );
};

const createInstanceChildrenElements = ({
  instanceSelector,
  children,
  Component,
  getComponent,
}: {
  instanceSelector: InstanceSelector;
  children: Instance["children"];
  Component: (props: ComponentProps<typeof WebstudioComponent>) => JSX.Element;
  getComponent: GetComponent;
}) => {
  const elements = [];
  for (const child of children) {
    if (child.type === "text") {
      elements.push(child.value);
      continue;
    }
    const childInstanceSelector = [child.id, ...instanceSelector];
    const children = createInstanceChildrenElements({
      instanceSelector: childInstanceSelector,
      children: child.children,
      Component,
      getComponent,
    });
    const element = createInstanceElement({
      instance: child,
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
  instance: Instance;
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
