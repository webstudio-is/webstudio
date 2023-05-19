import { atom } from "nanostores";
import type { WsComponentPropsMeta } from "@webstudio-is/react-sdk";

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
      props: propsMeta.props,
    });
  }
  registeredComponentPropsMetasStore.set(nextPropsMetas);
};

export const synchronizedComponentsMetaStores = [
  ["registeredComponentPropsMetas", registeredComponentPropsMetasStore],
] as const;
