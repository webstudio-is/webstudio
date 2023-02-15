import { Image } from "./image";
import { Link } from "./link";
import { RichTextLink } from "./rich-text-link";
import { imageProps } from "@webstudio-is/image";
import { MetaProps } from "../../components/component-type";

export const customComponents = {
  Image,
  Link,
  RichTextLink,
};

export const customComponentsMeta = {
  Image: {
    props: MetaProps.parse({
      ...imageProps,
      src: { ...imageProps.src, control: "file-image", name: "Source" },
    }),
  },
};
