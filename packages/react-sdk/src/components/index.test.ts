import { componentNames, getComponent } from "./index";
import { WsComponentMeta } from "./component-type";

test.each(componentNames)("validating meta definition of %s", (name) => {
  WsComponentMeta.parse(getComponent(name));
});
