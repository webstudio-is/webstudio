import * as components from "./index";
import { WsComponentMetaSchema } from "./component-type";

test.each(Object.entries(components))(
  "validating meta definition of %s",
  (name, component) => {
    if (name === "default") {
      return;
    }
    WsComponentMetaSchema.parse(component);
  }
);
