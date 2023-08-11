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
} from "@webstudio-is/react-sdk";
import type { Instance } from "@webstudio-is/project-build";
import { subscribe } from "~/shared/pubsub";
import { dataSourceVariablesStore, propsStore } from "./nano-states";
import { instancesStore, selectedPageStore } from ".";

type HookCommand = NonNullable<
  {
    [Name in keyof Hook]: {
      name: Name;
      data: Parameters<NonNullable<Hook[Name]>>[1];
    };
  }[keyof Hook]
>;

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    emitComponentHook: HookCommand;
  }
}

// subscribe component hooks emitted from builder
// and invoke all hooks
// name and data is mapped to [name](context, data)
export const subscribeComponentHooks = () => {
  return subscribe("emitComponentHook", (data) => {
    const hooks = registeredComponentHooksStore.get();
    const metas = registeredComponentMetasStore.get();
    const instances = instancesStore.get();
    const page = selectedPageStore.get();
    const indexesWithinAncestors = getIndexesWithinAncestors(
      metas,
      instances,
      page ? [page.rootInstanceId] : []
    );
    for (const hook of hooks) {
      const context: HookContext = {
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
          }
          dataSourceVariablesStore.set(dataSourceVariables);
        },
      };
      hook[data.name]?.(context, data.data);
    }
  });
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
