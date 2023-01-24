import type { PropsItem } from "@webstudio-is/react-sdk";
import ObjectId from "bson-objectid";

export const cloneUserProps = (props: Array<PropsItem>): Array<PropsItem> =>
  props.map((prop) => ({ ...prop, id: ObjectId().toString() }));
