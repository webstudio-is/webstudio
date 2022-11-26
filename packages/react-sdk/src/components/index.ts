import Body from "./body.ws";
import Box from "./box.ws";
import TextBlock from "./text-block.ws";
import Heading from "./heading.ws";
import Paragraph from "./paragraph.ws";
import Link from "./link.ws";
import Span from "./span.ws";
import Bold from "./bold.ws";
import Italic from "./italic.ws";
import Superscript from "./superscript.ws";
import Subscript from "./subscript.ws";
import Button from "./button.ws";
import Input from "./input.ws";
import Form from "./form.ws";
import Image from "./image.ws";

const components = {
  Body,
  Box,
  TextBlock,
  Heading,
  Paragraph,
  Link,
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

type RegisteredComponents = Partial<{
  [p in ComponentName]: {
    // @todo: Anyone knows what the type can be for any React Component?
    // eslint-disable-next-line @typescript-eslint/ban-types
    Component: {};
    meta?: Partial<Omit<typeof components[p], "Component">>;
  };
}>;

let registeredComponents: RegisteredComponents | null = null;

export type ComponentName = keyof typeof components;

export const componentNames = Object.keys(components) as ComponentName[];

export const getComponentMeta = <Name extends ComponentName>(
  name: Name
): Omit<typeof components[Name], "Component"> => {
  if (
    registeredComponents != null &&
    name in registeredComponents &&
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    registeredComponents[name]!.meta != null
  ) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return { ...components[name], ...registeredComponents[name]!.meta };
  }

  return components[name];
};

/**
 * @todo Remove Component from meta and read directly (via import),
 * as meta information is not needed during production render.
 **/
export const getComponent = <Name extends ComponentName>(
  name: Name
): typeof components[Name]["Component"] => {
  return registeredComponents != null && name in registeredComponents
    ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (registeredComponents[name]!
        .Component as typeof components[Name]["Component"])
    : components[name].Component;
};

/**
 *  @todo: Allow register any component.
 * Now we can register only existings Components, as all our type system would
 * break otherwise, see getComponent etc. So its overwriteComponent now
 **/
export const registerComponents = (components: RegisteredComponents) => {
  registeredComponents = components;
};
