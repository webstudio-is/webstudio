// eslint-disable-next-line import/no-internal-modules
import { Box } from "@webstudio-is/react-sdk";

export const getComponent = (name: string): undefined | typeof Box => {
  return Box;
};

/*
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
import { Blockquote } from "./blockquote";
import { List } from "./list";
import { ListItem } from "./list-item";
*/
