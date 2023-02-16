import { Image } from "./image";
import { Link } from "./link";
import { RichTextLink } from "./rich-text-link";
import { imageProps } from "@webstudio-is/image";
import type { WsComponentPropsMeta } from "../../components/component-type";

export const customComponents = {
  Image,
  Link,
  RichTextLink,
};

export const customComponentPropsMetas = {
  Image: {
    props: {
      ...imageProps,
      src: { ...imageProps.src, control: "file-image", name: "Source" },
    },
  } as WsComponentPropsMeta,
};

// just for completeness, maybe we add soemthing here later
export const customComponentMetas = {};
