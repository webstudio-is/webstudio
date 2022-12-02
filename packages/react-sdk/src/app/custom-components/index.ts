import { Image } from "./image";
import { Link } from "./link";
import { RichTextLink } from "./rich-text-link";
import { imageProps } from "@webstudio-is/image";
import type { MetaProps } from "../../components/component-type";

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
