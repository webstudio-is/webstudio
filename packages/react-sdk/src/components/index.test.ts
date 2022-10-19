import * as components from "./index";
import { WsComponentMeta } from "./component-type";

test.each(Object.entries(components))(
  "validating meta definition of %s",
  (name, component) => {
    if (name === "default") {
      return;
    }
    WsComponentMeta.parse(component);
  }
);
