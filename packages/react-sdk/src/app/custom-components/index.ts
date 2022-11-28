import { Image } from "./image";
import { imageProps } from "@webstudio-is/image";
import type { MetaProps } from "~/components/component-type";

export const customComponents = {
  Image,
};

export const customComponentsMeta = {
  Image: {
    props: imageProps as MetaProps,
  },
};
