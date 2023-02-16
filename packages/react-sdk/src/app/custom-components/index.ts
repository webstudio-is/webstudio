import { Image } from "./image";
import { Link } from "./link";
import { RichTextLink } from "./rich-text-link";
import { imageProps } from "@webstudio-is/image";
import { WsComponentPropsMeta } from "../../components/component-type";

export const customComponents = {
  Image,
  Link,
  RichTextLink,
};

export const customComponentPropsMetas = {
  Image: WsComponentPropsMeta.parse({
    props: {
      ...imageProps,
      src: { ...imageProps.src, control: "file-image", name: "Source" },
    },
  }),
};

// just for completeness, maybe we add soemthing here later
export const customComponentMetas = {};
