import type { UserProp } from "@webstudio-is/react-sdk";
import ObjectId from "bson-objectid";

export const cloneUserProps = (props: Array<UserProp>): Array<UserProp> =>
  props.map((prop) => ({ ...prop, id: ObjectId().toString() }));
