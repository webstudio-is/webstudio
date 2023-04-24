import * as boxMeta from "./box.ws";
import type { WsComponentMeta } from "./component-meta";

export const meta: WsComponentMeta = {
  ...boxMeta.meta,
  type: "container",
  label: "Success Message",
  category: undefined,
};

export const { propsMeta } = boxMeta;
