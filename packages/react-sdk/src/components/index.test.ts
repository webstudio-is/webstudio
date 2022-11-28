import {
  getComponentNames,
  getComponentMeta,
  getComponentMetaProps,
  registerComponentsMeta,
} from "./index";
import { WsComponentMeta } from "./component-type";

test.each(getComponentNames())("validating meta definition of %s", (name) => {
  WsComponentMeta.parse(getComponentMeta(name));
});

test("defaultValue will be used from Native Component", () => {
  registerComponentsMeta({
    Image: {
      props: {
        src: {
          defaultValue: null,
          required: false,
          type: "text",
        },
      },
    },
  });

  const props = getComponentMetaProps("Image");
  expect(props?.src?.defaultValue).toEqual("");
});
