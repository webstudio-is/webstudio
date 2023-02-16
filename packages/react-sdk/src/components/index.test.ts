import { test } from "@jest/globals";
import { getComponentNames, getComponentMeta } from "./index";
import { WsComponentMeta } from "./component-type";

test.each(getComponentNames())("validating meta definition of %s", (name) => {
  WsComponentMeta.parse(getComponentMeta(name));
});
