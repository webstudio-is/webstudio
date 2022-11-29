import { Image } from "./image";
export * as Link from "./link";
export * as RichTextLink from "./rich-text-link";
import { imageProps } from "@webstudio-is/image";
import type { MetaProps } from "../../components/component-type";

// @todo: fix rebase
export const customComponents = {
  Image,
  Link,
  RichTextLink,
};

export const customComponentsMeta = {
  Image: {
    props: imageProps as MetaProps,
  },
};
