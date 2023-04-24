import * as boxMeta from "./box.ws";
import type { WsComponentMeta } from "./component-meta";

export const meta: WsComponentMeta = {
  ...boxMeta.meta,
  type: "container",
  label: "Success Message",
};

export const { propsMeta } = boxMeta;
