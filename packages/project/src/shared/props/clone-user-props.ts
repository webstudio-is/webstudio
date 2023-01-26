import ObjectId from "bson-objectid";
import type { PropsItem } from "@webstudio-is/project-build";

export const cloneUserProps = (props: Array<PropsItem>): Array<PropsItem> =>
  props.map((prop) => ({ ...prop, id: ObjectId().toString() }));
