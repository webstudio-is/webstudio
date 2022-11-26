import Body from "./__generated__/body.props.json";
import Button from "./__generated__/button.props.json";
import Bold from "./__generated__/bold.props.json";
import Box from "./__generated__/box.props.json";
import Form from "./__generated__/form.props.json";
import Heading from "./__generated__/heading.props.json";
import Input from "./__generated__/input.props.json";
import Italic from "./__generated__/italic.props.json";
import Superscript from "./__generated__/superscript.props.json";
import Subscript from "./__generated__/subscript.props.json";
import Link from "./__generated__/link.props.json";
import Paragraph from "./__generated__/paragraph.props.json";
import Span from "./__generated__/span.props.json";
import TextBlock from "./__generated__/text-block.props.json";
import Image from "./__generated__/image.props.json";

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

export const getComponentMetaProps = (name: keyof typeof meta): MetaProps => {
  return meta[name] as MetaProps;
};
