import type { ExoticComponent } from "react";
import { atom } from "nanostores";
import {
  namespaceMeta,
  type AnyComponent,
  type WsComponentMeta,
  type WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";
import type { Instance } from "@webstudio-is/project-build";

export const registeredComponentsStore = atom(new Map<string, AnyComponent>());

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
}: {
  namespace?: string;
  // simplify adding component libraries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components: Record<Instance["component"], ExoticComponent<any>>;
  metas: Record<Instance["component"], WsComponentMeta>;
  propsMetas: Record<Instance["component"], WsComponentPropsMeta>;
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
