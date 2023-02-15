import { PropMeta } from "@webstudio-is/generate-arg-types";
import type { WsComponentMeta, MetaProps } from "./component-type";

import BodyMeta from "./body.ws";
import BoxMeta from "./box.ws";
import TextBlockMeta from "./text-block.ws";
import HeadingMeta from "./heading.ws";
import ParagraphMeta from "./paragraph.ws";
import LinkMeta from "./link.ws";
import RichTextLinkMeta from "./rich-text-link.ws";
import SpanMeta from "./span.ws";
import BoldMeta from "./bold.ws";
import ItalicMeta from "./italic.ws";
import SuperscriptMeta from "./superscript.ws";
import SubscriptMeta from "./subscript.ws";
import ButtonMeta from "./button.ws";
import InputMeta from "./input.ws";
import FormMeta from "./form.ws";
import ImageMeta from "./image.ws";

import { Body } from "./body";
import { Box } from "./box";
import { TextBlock } from "./text-block";
import { Heading } from "./heading";
import { Paragraph } from "./paragraph";
import { Link } from "./link";
import { RichTextLink } from "./rich-text-link";
import { Span } from "./span";
import { Bold } from "./bold";
import { Italic } from "./italic";
import { Superscript } from "./superscript";
import { Subscript } from "./subscript";
import { Button } from "./button";
import { Input } from "./input";
import { Form } from "./form";
import { Image } from "./image";

const meta = {
  Box: BoxMeta,
  Body: BodyMeta,
  TextBlock: TextBlockMeta,
  Heading: HeadingMeta,
  Paragraph: ParagraphMeta,
  Link: LinkMeta,
  RichTextLink: RichTextLinkMeta,
  Span: SpanMeta,
  Bold: BoldMeta,
  Italic: ItalicMeta,
  Superscript: SuperscriptMeta,
  Subscript: SubscriptMeta,
  Button: ButtonMeta,
  Input: InputMeta,
  Form: FormMeta,
  Image: ImageMeta,
} as const;

const components = {
  Box,
  Body,
  TextBlock,
  Heading,
  Paragraph,
  Link,
  RichTextLink,
  Span,
  Bold,
  Italic,
  Superscript,
  Subscript,
  Button,
  Input,
  Form,
  Image,
} as const;

export type ComponentName = keyof typeof components;
type RegisteredComponents = Partial<{
  // eslint-disable-next-line @typescript-eslint/ban-types
  [name in ComponentName]: {};
}>;

let registeredComponents: RegisteredComponents | null = null;

const componentNames = Object.keys(components) as ComponentName[];

export const getComponentNames = (): ComponentName[] => {
  const uniqueNames = new Set([
    ...componentNames,
    ...Object.keys(registeredComponents || {}),
  ]);

  return [...uniqueNames.values()] as ComponentName[];
};

export const getComponent = (
  name: string
): undefined | typeof components[ComponentName] => {
  return registeredComponents != null && name in registeredComponents
    ? (registeredComponents[
        name as ComponentName
      ] as typeof components[ComponentName])
    : components[name as ComponentName];
};

const preprocessProps = (
  defaults: WsComponentMeta,
  overrides: Partial<WsComponentMeta>
): MetaProps => {
  if (overrides) {
    const allNames = new Set([
      ...Object.keys(defaults.props ?? {}),
      ...Object.keys(overrides?.props ?? {}),
    ]).values();

    const result: MetaProps = {};
    for (const name of allNames) {
      result[name] = PropMeta.parse({
        ...defaults.props[name],
        ...overrides?.props?.[name],
      });
    }
    return result;
  }

  return defaults.props;
};

const preprocessInitialProps = (
  props: MetaProps,
  defaults: WsComponentMeta,
  overrides: Partial<WsComponentMeta>
): Array<string> => {
  const initialProps = overrides?.initialProps ?? defaults?.initialProps ?? [];
  const requiredProps = props
    ? Object.entries(props)
        .filter(
          ([name, value]) =>
            value?.required && initialProps.includes(name) === false
        )
        .map(([name]) => name)
    : [];

  // order of initialProps must be preserved
  return [...initialProps, ...requiredProps];
};

const preprocessMetas = (
  defaults: Record<string, WsComponentMeta>,
  overrides: Record<string, Partial<WsComponentMeta> | undefined>
) => {
  const result: Record<string, WsComponentMeta> = {};
  for (const name of Object.keys(defaults)) {
    const props = preprocessProps(defaults[name], overrides[name] ?? {});
    const initialProps = preprocessInitialProps(
      props,
      defaults[name],
      overrides[name] ?? {}
    );
    result[name] = {
      ...defaults[name],
      ...overrides[name],
      props,
      initialProps,
    };
  }
  return result;
};

let currentMeta = preprocessMetas(meta, {});

export const getComponentMeta = (name: string): WsComponentMeta | undefined => {
  return currentMeta[name];
};

/**
 *  @todo: Allow register any component.
 * Now we can register only existings Components, as all our type system would
 * break otherwise, see getComponent etc. So its overwriteComponent now
 **/
export const registerComponents = (components: RegisteredComponents) => {
  registeredComponents = components;
};

export const registerComponentsMeta = (
  overrides: Record<string, Partial<WsComponentMeta> | undefined>
) => {
  currentMeta = preprocessMetas(meta, overrides);
};
