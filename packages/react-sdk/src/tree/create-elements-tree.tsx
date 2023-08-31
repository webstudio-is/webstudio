import {
  Fragment,
  type ForwardRefExoticComponent,
  type RefAttributes,
  type ReactNode,
} from "react";
import type { ReadableAtom } from "nanostores";
import type { Assets } from "@webstudio-is/sdk";
import type { Instance, Instances } from "@webstudio-is/project-build";
import type { Components } from "../components/components-utils";
import {
  type Params,
  type DataSourceValues,
  ReactSdkContext,
} from "../context";
import type { Pages, PropsByInstanceId } from "../props";
import type { WebstudioComponentProps } from "./webstudio-component";
import type { IndexesWithinAncestors } from "../instance-utils";

type InstanceSelector = Instance["id"][];

export const createElementsTree = ({
  renderer,
  imageBaseUrl,
  assetBaseUrl,
  instances,
  rootInstanceId,
  propsByInstanceIdStore,
  assetsStore,
  pagesStore,
  dataSourceValuesStore,
  executeEffectfulExpression,
  onDataSourceUpdate,
  indexesWithinAncestors,
  Component,
  components,
  scripts,
}: Params & {
  instances: Instances;
  rootInstanceId: Instance["id"];
  propsByInstanceIdStore: ReadableAtom<PropsByInstanceId>;
  assetsStore: ReadableAtom<Assets>;
  pagesStore: ReadableAtom<Pages>;
  executeEffectfulExpression: (
    expression: string,
    args: DataSourceValues,
    values: DataSourceValues
  ) => DataSourceValues;
  dataSourceValuesStore: ReadableAtom<DataSourceValues>;
  onDataSourceUpdate: (newValues: DataSourceValues) => void;
  indexesWithinAncestors: IndexesWithinAncestors;

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
        propsByInstanceIdStore,
        assetsStore,
        pagesStore,
        dataSourceValuesStore,
        renderer,
        imageBaseUrl,
        assetBaseUrl,
        indexesWithinAncestors,
        executeEffectfulExpression,
        setDataSourceValues: onDataSourceUpdate,
        setBoundDataSourceValue: (instanceId, propName, value) => {
          const propsByInstanceId = propsByInstanceIdStore.get();
          const props = propsByInstanceId.get(instanceId);
          const prop = props?.find((prop) => prop.name === propName);
          if (prop?.type !== "dataSource") {
            throw Error(`${propName} is not data source`);
          }
          const dataSourceId = prop.value;
          const newValues = new Map();
          newValues.set(dataSourceId, value);
          onDataSourceUpdate(newValues);
        },
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
