import { Props, Prop } from "../schema/props";

export const parseProps = (propsString: string): Props => {
  const propsList = JSON.parse(propsString) as Prop[];
  return new Map(propsList.map((prop) => [prop.id, prop]));
};

export const serializeProps = (props: Props) => {
  const propsList: Prop[] = Array.from(props.values());
  return JSON.stringify(propsList);
};
