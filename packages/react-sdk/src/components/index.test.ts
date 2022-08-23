import * as components from "./index";
import { WsComponentMetaSchema } from "./component-type";

test.each(Object.entries(components))("validating: %s", (name, component) => {
  if (name === "default") {
    return;
  }
  WsComponentMetaSchema.parse(component);
});
