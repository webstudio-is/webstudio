import { atom } from "nanostores";
import type {
  WsComponentMeta,
  WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";

export const registeredComponentMetasStore = atom(
  new Map<string, WsComponentMeta>()
);

export const registerComponentMetas = (
  newMetas: Record<string, WsComponentMeta>
) => {
  const prevMetas = registeredComponentMetasStore.get();
  const nextMetas = new Map(prevMetas);
  for (const [componentName, meta] of Object.entries(newMetas)) {
    nextMetas.set(componentName, meta);
  }
  registeredComponentMetasStore.set(nextMetas);
};

export const registeredComponentPropsMetasStore = atom(
  new Map<string, WsComponentPropsMeta>()
);

export const registerComponentPropsMetas = (
  newPropsMetas: Record<string, WsComponentPropsMeta>
) => {
  const prevPropsMetas = registeredComponentPropsMetasStore.get();
  const nextPropsMetas = new Map(prevPropsMetas);
  for (const [componentName, propsMeta] of Object.entries(newPropsMetas)) {
    const { initialProps = [], props } = propsMeta;
    const requiredProps: string[] = [];
    for (const [name, value] of Object.entries(props)) {
      if (value.required && initialProps.includes(name) === false) {
        requiredProps.push(name);
      }
    }
    nextPropsMetas.set(componentName, {
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
