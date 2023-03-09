import { TextControl } from "./text";
import { ColorControl } from "./color";
import { NumberControl } from "./number";
import { CheckControl } from "./check";
import { RadioControl } from "./radio";
import { SelectControl } from "./select";
import { BooleanControl } from "./boolean";
import { FileImageControl } from "./file-image";
import type { ControlProps } from "../shared";

export const renderControl = ({
  meta,
  prop,
  ...rest
}: ControlProps<string, string>) => {
  if (
    meta.control === "text" &&
    (prop === undefined || prop.type === "string")
  ) {
    return <TextControl meta={meta} prop={prop} {...rest} />;
  }

  if (
    meta.control === "color" &&
    (prop === undefined || prop.type === "string")
  ) {
    return <ColorControl meta={meta} prop={prop} {...rest} />;
  }

  if (
    meta.control === "number" &&
    (prop === undefined || prop.type === "number")
  ) {
    return <NumberControl meta={meta} prop={prop} {...rest} />;
  }

  if (
    meta.control === "boolean" &&
    (prop === undefined || prop.type === "boolean")
  ) {
    return <BooleanControl meta={meta} prop={prop} {...rest} />;
  }

  if (
    (meta.control === "check" ||
      meta.control === "inline-check" ||
      meta.control === "multi-select") &&
    (prop === undefined || prop.type === "string[]")
  ) {
    return <CheckControl meta={meta} prop={prop} {...rest} />;
  }

  if (
    (meta.control === "radio" || meta.control === "inline-radio") &&
    (prop === undefined || prop.type === "string")
  ) {
    return <RadioControl meta={meta} prop={prop} {...rest} />;
  }

  if (
    meta.control === "select" &&
    (prop === undefined || prop.type === "string")
  ) {
    return <SelectControl meta={meta} prop={prop} {...rest} />;
  }

  if (
    meta.control === "file-image" &&
    (prop === undefined || prop.type === "asset")
  ) {
    return <FileImageControl meta={meta} prop={prop} {...rest} />;
  }

  // Type in meta can be changed at some point without updating props in DB that are still using the old type
  // In this case meta and prop will mismatch, but we try to guess a matching control based just on the prop type
  if (prop) {
    if (prop.type === "string") {
      return (
        <TextControl
          meta={{
            ...meta,
            defaultValue: undefined,
            control: "text",
            type: "string",
          }}
          prop={prop}
          {...rest}
        />
      );
    }

    if (prop.type === "number") {
      return (
        <NumberControl
          meta={{
            ...meta,
            defaultValue: undefined,
            control: "number",
            type: "number",
          }}
          prop={prop}
          {...rest}
        />
      );
    }

    if (prop.type === "boolean") {
      return (
        <BooleanControl
          meta={{
            ...meta,
            defaultValue: undefined,
            control: "boolean",
            type: "boolean",
          }}
          prop={prop}
          {...rest}
        />
      );
    }

    if (prop.type === "asset") {
      return (
        <FileImageControl
          meta={{
            ...meta,
            defaultValue: undefined,
            control: "file-image",
            type: "string",
          }}
          prop={prop}
          {...rest}
        />
      );
    }
  }

  throw new Error(
    `Unsupported combination of prop and control: name=${rest.propName}, type=${prop?.type}, control=${meta.control}`
  );
};
