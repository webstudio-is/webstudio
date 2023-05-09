import { Props, PropsList } from "../schema/props";

export const parseProps = (
  propsString: string,
  skipValidation = false
): Props => {
  const propsList = skipValidation
    ? (JSON.parse(propsString) as PropsList)
    : PropsList.parse(JSON.parse(propsString));
  return new Map(propsList.map((prop) => [prop.id, prop]));
};

export const serializeProps = (props: Props) => {
  const propsList: PropsList = Array.from(props.values());
  return JSON.stringify(propsList);
};
