/**
 * This file should contain all the components that we use in the production published app
 *
 * The application imports only the components it uses and uses
 * getComponent = createGetComponent({ Box, BlaBla })to pass them to RootInstance
 * see example /packages/sdk-size-test/app/routes/$.tsx
 */
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
import { Blockquote } from "./blockquote";
import { List } from "./list";
import { ListItem } from "./list-item";

export {
  Body,
  Box,
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
  Blockquote,
  List,
  ListItem,
};
