import Body from "./body.props.json";
import Button from "./button.props.json";
import Bold from "./bold.props.json";
import Box from "./box.props.json";
import Form from "./form.props.json";
import Heading from "./heading.props.json";
import Input from "./input.props.json";
import Italic from "./italic.props.json";
import Superscript from "./superscript.props.json";
import Subscript from "./subscript.props.json";
import Link from "./link.props.json";
import Paragraph from "./paragraph.props.json";
import Span from "./span.props.json";
import TextBlock from "./text-block.props.json";
import Image from "./image.props.json";

const meta = {
  Body,
  Button,
  Bold,
  Box,
  Form,
  Heading,
  Input,
  Italic,
  Superscript,
  Subscript,
  Link,
  Paragraph,
  Span,
  TextBlock,
  Image,
} as const;

type MetaProp =
  | {
      type: "text";
      required: boolean;
      defaultValue: null | string;
    }
  | {
      type: "boolean";
      required: boolean;
      defaultValue: null | boolean;
    }
  | {
      type:
        | "radio"
        | "inline-radio"
        | "check"
        | "inline-check"
        | "multi-select"
        | "select";
      required: boolean;
      defaultValue: null | string;
      options: string[];
    };

type MetaProps = Record<string, MetaProp>;

// Probably better instead of JSON to generate ts with `as const`
export const componentsMeta: Record<keyof typeof meta, MetaProps> =
  meta as Record<keyof typeof meta, MetaProps>;
