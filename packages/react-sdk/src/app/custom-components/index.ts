import { imageProps } from "@webstudio-is/image";
import type { WsComponentPropsMeta } from "../../components/component-meta";
import { Image } from "./image";
import { Link } from "./link";
import { LinkBlock } from "./link-block";
import { RichTextLink } from "./rich-text-link";
import { Form } from "./form";
import { meta as formMeta, propsMeta as formPropsMeta } from "./form.ws";

export const customComponents = {
  Image,
  Link,
  RichTextLink,
  LinkBlock,
  Form,
};

export const customComponentPropsMetas: Record<string, WsComponentPropsMeta> = {
  Image: {
    props: imageProps,
    initialProps: ["src", "width", "height", "alt", "loading"],
  },
  Form: formPropsMeta,
};

export const customComponentMetas = {
  Form: formMeta,
};
