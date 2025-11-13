import { nanoid } from "nanoid";
import { shallowEqual } from "shallow-equal";
import type { ExoticComponent } from "react";
import { atom, computed } from "nanostores";
import type {
  AnyComponent,
  Hook,
  HookContext,
  InstanceData,
} from "@webstudio-is/react-sdk";
import {
  getIndexesWithinAncestors,
  type Instance,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import type { InstanceSelector } from "../tree-utils";
import { $memoryProps, $props } from "./misc";
import { $instances } from "./instances";
import { $awareness, $selectedPage, getInstanceKey } from "../awareness";
import {
  renderTemplate,
  type GeneratedTemplateMeta,
  type TemplateMeta,
} from "@webstudio-is/template";

const createHookContext = (): HookContext => {
  const metas = $registeredComponentMetas.get();
  const instances = $instances.get();
  const page = $selectedPage.get();
  const indexesWithinAncestors = getIndexesWithinAncestors(
    metas,
    instances,
    page ? [page.rootInstanceId] : []
  );

  return {
    indexesWithinAncestors,

    getPropValue: ({ id }, propName) => {
      const props = $props.get();
      for (const prop of props.values()) {
        if (prop.instanceId === id && prop.name === propName) {
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

    setMemoryProp: (instanceData: InstanceData, propName, value) => {
      const { instanceKey } = instanceData;
      const props = new Map($memoryProps.get());

      const newProps = props.get(instanceKey) ?? new Map();

      const propBase = {
        id: nanoid(),
        instanceId: instanceData.id,
        name: propName,
      };

      if (value !== undefined) {
        switch (typeof value) {
          case "string":
            newProps.set(propName, {
              ...propBase,
              type: "string",
              value,
            });
            break;
          case "number":
            newProps.set(propName, {
              ...propBase,
              type: "number",
              value,
            });
            break;
          case "boolean":
            newProps.set(propName, {
              ...propBase,
              type: "boolean",
              value,
            });
            break;
          default:
            throw new Error(`Unsupported type ${typeof value}`);
        }
      } else {
        newProps.delete(propName);
      }

      props.set(instanceKey, newProps);

      $memoryProps.set(props);
    },
  };
};

const $instanceSelector = computed(
  $awareness,
  (awareness) => awareness?.instanceSelector
);

// subscribe builder events and invoke all component hooks
export const subscribeComponentHooks = () => {
  let lastInstanceSelector: undefined | InstanceSelector = undefined;
  const unsubscribeSelectedInstanceSelector = $instanceSelector.subscribe(
    (instanceSelector) => {
      // prevent executing hooks when selected instance is not changed
      if (shallowEqual(lastInstanceSelector, instanceSelector)) {
        return;
      }
      const hooks = $registeredComponentHooks.get();
      const instances = $instances.get();
      if (lastInstanceSelector) {
        for (const hook of hooks) {
          hook.onNavigatorUnselect?.(createHookContext(), {
            instancePath: lastInstanceSelector.flatMap((id, index, array) => {
              const instance = instances.get(id);
              if (instance === undefined) {
                return [];
              }
              return {
                id: instance.id,
                instanceKey: getInstanceKey(array.slice(index)),
                component: instance.component,
                tag: instance.tag,
              };
            }),
          });
        }
      }

      if (instanceSelector) {
        for (const hook of hooks) {
          hook.onNavigatorSelect?.(createHookContext(), {
            instancePath: instanceSelector.flatMap((id, index, array) => {
              const instance = instances.get(id);
              if (instance === undefined) {
                return [];
              }
              return {
                id: instance.id,
                instanceKey: getInstanceKey(array.slice(index)),
                component: instance.component,
                tag: instance.tag,
              };
            }),
          });
        }
      }

      // store converts values to readonly
      lastInstanceSelector = instanceSelector as InstanceSelector;
    }
  );

  return () => {
    unsubscribeSelectedInstanceSelector();
  };
};

export const $registeredComponents = atom(new Map<string, AnyComponent>());

export const $registeredComponentHooks = atom<Hook[]>([]);

export const $registeredComponentMetas = atom(
  new Map<string, WsComponentMeta>()
);

export const $registeredTemplates = atom(
  new Map<string, GeneratedTemplateMeta>()
);

export const registerComponentLibrary = ({
  namespace,
  components,
  metas,
  hooks,
  templates,
}: {
  namespace?: string;
  // simplify adding component libraries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components: Record<Instance["component"], ExoticComponent<any>>;
  metas: Record<Instance["component"], WsComponentMeta>;
  hooks?: Hook[];
  templates: Record<Instance["component"], TemplateMeta>;
}) => {
  const prefix = namespace === undefined ? "" : `${namespace}:`;

  const prevComponents = $registeredComponents.get();
  const nextComponents = new Map(prevComponents);
  for (const [componentName, component] of Object.entries(components)) {
    nextComponents.set(`${prefix}${componentName}`, component);
  }
  $registeredComponents.set(nextComponents);

  const prevMetas = $registeredComponentMetas.get();
  const nextMetas = new Map(prevMetas);
  for (const [componentName, meta] of Object.entries(metas)) {
    nextMetas.set(`${prefix}${componentName}`, meta);
  }
  $registeredComponentMetas.set(nextMetas);

  const prevTemplates = $registeredTemplates.get();
  const nextTemplates = new Map(prevTemplates);
  for (const [componentName, meta] of Object.entries(templates)) {
    const { template, ...generatedMeta } = meta;
    nextTemplates.set(`${prefix}${componentName}`, {
      ...generatedMeta,
      template: renderTemplate(template),
    });
  }
  $registeredTemplates.set(nextTemplates);

  if (hooks) {
    const prevHooks = $registeredComponentHooks.get();
    const nextHooks = [...prevHooks, ...hooks];
    $registeredComponentHooks.set(nextHooks);
  }
};
