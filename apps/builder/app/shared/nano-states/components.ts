import type { ExoticComponent } from "react";
import { atom } from "nanostores";
import {
  type AnyComponent,
  type WsComponentMeta,
  type WsComponentPropsMeta,
  type Hook,
  type HookContext,
  namespaceMeta,
  getIndexesWithinAncestors,
  decodeDataSourceVariable,
} from "@webstudio-is/react-sdk";
import type { Instance } from "@webstudio-is/sdk";
import type { InstanceSelector } from "../tree-utils";
import {
  dataSourceVariablesStore,
  dataSourcesStore,
  propsStore,
} from "./nano-states";
import { instancesStore, selectedInstanceSelectorStore } from "./instances";
import { selectedPageStore } from "./pages";
import { shallowEqual } from "shallow-equal";

const createHookContext = (): HookContext => {
  const metas = registeredComponentMetasStore.get();
  const instances = instancesStore.get();
  const page = selectedPageStore.get();
  const indexesWithinAncestors = getIndexesWithinAncestors(
    metas,
    instances,
    page ? [page.rootInstanceId] : []
  );

  return {
    indexesWithinAncestors,

    getPropValue: (instanceId, propName) => {
      const props = propsStore.get();
      for (const prop of props.values()) {
        if (prop.instanceId === instanceId && prop.name === propName) {
          if (
            prop.type === "string" ||
            prop.type === "number" ||
            prop.type === "boolean" ||
            prop.type === "string[]"
          ) {
            return prop.value;
          }
        }
      }
    },

    setPropVariable: (instanceId, propName, value) => {
      const dataSourceVariables = new Map(dataSourceVariablesStore.get());
      const dataSources = new Map(dataSourcesStore.get());
      const props = propsStore.get();
      for (const prop of props.values()) {
        if (
          prop.instanceId === instanceId &&
          prop.name === propName &&
          prop.type === "dataSource"
        ) {
          const dataSourceId = prop.value;
          dataSourceVariables.set(dataSourceId, value);
        }
        if (
          prop.instanceId === instanceId &&
          prop.name === propName &&
          prop.type === "expression"
        ) {
          // extract id without parsing expression
          const potentialVariableId = decodeDataSourceVariable(prop.value);
          if (
            potentialVariableId !== undefined &&
            dataSources.has(potentialVariableId)
          ) {
            const dataSourceId = potentialVariableId;
            dataSourceVariables.set(dataSourceId, value);
          }
        }
      }
      dataSourceVariablesStore.set(dataSourceVariables);
    },
  };
};

// subscribe builder events and invoke all component hooks
export const subscribeComponentHooks = () => {
  let lastSelectedInstanceSelector: undefined | InstanceSelector = undefined;
  const unsubscribeSelectedInstanceSelector =
    selectedInstanceSelectorStore.subscribe((instanceSelector) => {
      // prevent executing hooks when selected instance is not changed
      if (shallowEqual(lastSelectedInstanceSelector, instanceSelector)) {
        return;
      }
      const hooks = registeredComponentHooksStore.get();
      const instances = instancesStore.get();
      if (lastSelectedInstanceSelector) {
        for (const hook of hooks) {
          hook.onNavigatorUnselect?.(createHookContext(), {
            instancePath: lastSelectedInstanceSelector.flatMap((id) => {
              const instance = instances.get(id);
              return instance ? [instance] : [];
            }),
          });
        }
      }

      if (instanceSelector) {
        for (const hook of hooks) {
          hook.onNavigatorSelect?.(createHookContext(), {
            instancePath: instanceSelector.flatMap((id) => {
              const instance = instances.get(id);
              return instance ? [instance] : [];
            }),
          });
        }
      }

      // store converts values to readonly
      lastSelectedInstanceSelector = instanceSelector as InstanceSelector;
    });

  return () => {
    unsubscribeSelectedInstanceSelector();
  };
};

export const registeredComponentsStore = atom(new Map<string, AnyComponent>());

export const registeredComponentHooksStore = atom<Hook[]>([]);

export const registeredComponentMetasStore = atom(
  new Map<string, WsComponentMeta>()
);

export const registeredComponentPropsMetasStore = atom(
  new Map<string, WsComponentPropsMeta>()
);

export const registerComponentLibrary = ({
  namespace,
  components,
  metas,
  propsMetas,
  hooks,
}: {
  namespace?: string;
  // simplify adding component libraries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components: Record<Instance["component"], ExoticComponent<any>>;
  metas: Record<Instance["component"], WsComponentMeta>;
  propsMetas: Record<Instance["component"], WsComponentPropsMeta>;
  hooks?: Hook[];
}) => {
  const prefix = namespace === undefined ? "" : `${namespace}:`;

  const prevComponents = registeredComponentsStore.get();
  const nextComponents = new Map(prevComponents);
  for (const [componentName, component] of Object.entries(components)) {
    nextComponents.set(`${prefix}${componentName}`, component);
  }
  registeredComponentsStore.set(nextComponents);

  const prevMetas = registeredComponentMetasStore.get();
  const nextMetas = new Map(prevMetas);
  for (const [componentName, meta] of Object.entries(metas)) {
    nextMetas.set(
      `${prefix}${componentName}`,
      namespace === undefined
        ? meta
        : namespaceMeta(meta, namespace, new Set(Object.keys(metas)))
    );
  }
  registeredComponentMetasStore.set(nextMetas);

  if (hooks) {
    const prevHooks = registeredComponentHooksStore.get();
    const nextHooks = [...prevHooks, ...hooks];
    registeredComponentHooksStore.set(nextHooks);
  }

  const prevPropsMetas = registeredComponentPropsMetasStore.get();
  const nextPropsMetas = new Map(prevPropsMetas);
  for (const [componentName, propsMeta] of Object.entries(propsMetas)) {
    const { initialProps = [], props } = propsMeta;
    const requiredProps: string[] = [];
    for (const [name, value] of Object.entries(props)) {
      if (value.required && initialProps.includes(name) === false) {
        requiredProps.push(name);
      }
    }
    nextPropsMetas.set(`${prefix}${componentName}`, {
      // order of initialProps must be preserved
      initialProps: [...initialProps, ...requiredProps],
      props,
    });
  }
  registeredComponentPropsMetasStore.set(nextPropsMetas);
};

export const synchronizedComponentsMetaStores = [
  ["registeredComponentMetas", registeredComponentMetasStore],
  ["registeredComponentPropsMetas", registeredComponentPropsMetasStore],
] as const;
