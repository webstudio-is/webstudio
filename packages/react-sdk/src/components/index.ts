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

export type ComponentName = keyof typeof components;

export const componentNames = Object.keys(components) as ComponentName[];

// @todo We already have getComponentMetaProps export
export const getWsComponentMeta = <Name extends ComponentName>(
  name: Name
): Omit<typeof components[Name], "Component"> => {
  return components[name];
};

// @todo Remove Component from meta and read directly, as meta information is not needed during
// production render
export const getComponent = <Name extends ComponentName>(
  name: Name
): typeof components[Name]["Component"] => {
  return components[name].Component;
};
