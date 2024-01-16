// DEPRECATED: use parseData and serializeData from build.ts
import { Props, Prop } from "@webstudio-is/sdk";

export const parseProps = (propsString: string): Props => {
  const propsList = JSON.parse(propsString) as Prop[];
  return new Map(propsList.map((prop) => [prop.id, prop]));
};

export const serializeProps = (props: Props) => {
  const propsList: Prop[] = Array.from(props.values());
  return JSON.stringify(propsList);
};
