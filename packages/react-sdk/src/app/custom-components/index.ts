import type { WsComponentPropsMeta } from "../../components/component-meta";
import { Link } from "./link";
import { LinkBlock } from "./link-block";
import { RichTextLink } from "./rich-text-link";
import { Form } from "./form";
import {
  meta as formMeta,
  propsMeta as formPropsMeta,
} from "../../components/form.ws";

export const customComponents = {
  Link,
  RichTextLink,
  LinkBlock,
  Form,
};

export const customComponentPropsMetas: Record<string, WsComponentPropsMeta> = {
  Form: formPropsMeta,
};

export const customComponentMetas = {
  Form: formMeta,
};
