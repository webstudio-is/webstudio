import { TextControl } from "./text";
import { CodeControl } from "./code";
import { NumberControl } from "./number";
import { CheckControl } from "./check";
import { RadioControl } from "./radio";
import { SelectControl } from "./select";
import { BooleanControl } from "./boolean";
import { FileControl } from "./file";
import { UrlControl } from "./url";
import type { ControlProps } from "../shared";
import { JsonControl } from "./json";

export const renderControl = ({
  meta,
  prop,
  ...rest
}: ControlProps<string, string> & { key?: string }) => {
  const computed = rest.computedValue;

  // never render parameter props
  if (prop?.type === "parameter") {
    return;
  }

  // @todo remove once ui for action is implemented
  if (prop?.type === "action") {
    return;
  }

  if (
    meta.control === "json" &&
    (prop === undefined ||
      prop.type === "json" ||
      (prop.type === "expression" && typeof computed === "object"))
  ) {
    return <JsonControl meta={meta} prop={prop} {...rest} />;
  }

  if (
    meta.control === "text" &&
    (prop === undefined ||
      prop.type === "string" ||
      (prop.type === "expression" && typeof computed === "string"))
  ) {
    return <TextControl meta={meta} prop={prop} {...rest} />;
  }

  if (
    meta.control === "code" &&
    (prop === undefined ||
      prop.type === "string" ||
      (prop.type === "expression" && typeof computed === "string"))
  ) {
    return <CodeControl meta={meta} prop={prop} {...rest} />;
  }

  if (
    meta.control === "color" &&
    (prop === undefined || prop.type === "string")
  ) {
    return (
      <TextControl meta={{ ...meta, control: "text" }} prop={prop} {...rest} />
    );
  }

  if (
    meta.control === "number" &&
    (prop === undefined ||
      prop.type === "number" ||
      (prop.type === "expression" && typeof computed === "number"))
  ) {
    return <NumberControl meta={meta} prop={prop} {...rest} />;
  }

  if (
    meta.control === "boolean" &&
    (prop === undefined ||
      prop.type === "boolean" ||
      (prop.type === "expression" && typeof computed === "boolean"))
  ) {
    return <BooleanControl meta={meta} prop={prop} {...rest} />;
  }

  if (
    (meta.control === "check" ||
      meta.control === "inline-check" ||
      meta.control === "multi-select") &&
    (prop === undefined ||
      prop.type === "string[]" ||
      (prop.type === "expression" && typeof computed === "object"))
  ) {
    return <CheckControl meta={meta} prop={prop} {...rest} />;
  }

  if (
    (meta.control === "radio" || meta.control === "inline-radio") &&
    (prop === undefined ||
      prop.type === "string" ||
      (prop.type === "expression" && typeof computed === "string"))
  ) {
    return <RadioControl meta={meta} prop={prop} {...rest} />;
  }

  if (
    meta.control === "select" &&
    (prop === undefined ||
      prop.type === "string" ||
      (prop.type === "expression" && typeof computed === "string"))
  ) {
    return <SelectControl meta={meta} prop={prop} {...rest} />;
  }

  if (
    meta.control === "file" &&
    (prop === undefined ||
      prop.type === "asset" ||
      prop.type === "string" ||
      (prop.type === "expression" && typeof computed === "string"))
  ) {
    return <FileControl meta={meta} prop={prop} {...rest} />;
  }

  if (
    meta.control === "url" &&
    (prop === undefined ||
      prop.type === "string" ||
      prop.type === "page" ||
      prop.type === "asset" ||
      (prop.type === "expression" && typeof computed === "string"))
  ) {
    return <UrlControl meta={meta} prop={prop} {...rest} />;
  }

  // Type in meta can be changed at some point without updating props in DB that are still using the old type
  // In this case meta and prop will mismatch, but we try to guess a matching control based just on the prop type
  if (prop) {
    if (prop.type === "asset") {
      return (
        <FileControl
          meta={{
            ...meta,
            defaultValue: undefined,
            control: "file",
            type: "string",
          }}
          prop={prop}
          {...rest}
        />
      );
    }

    if (prop.type === "page") {
      return (
        <UrlControl
          meta={{
            ...meta,
            defaultValue: undefined,
            control: "url",
            type: "string",
          }}
          prop={prop}
          {...rest}
        />
      );
    }

    if (
      prop.type === "string" ||
      (prop.type === "expression" && typeof computed === "string")
    ) {
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

    if (
      prop.type === "number" ||
      (prop.type === "expression" && typeof computed === "number")
    ) {
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

    if (
      prop.type === "boolean" ||
      (prop.type === "expression" && typeof computed === "boolean")
    ) {
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

    if (prop.type === "json" || prop.type === "expression") {
      return (
        <JsonControl
          meta={{
            ...meta,
            defaultValue: undefined,
            control: "json",
            type: "json",
          }}
          prop={prop}
          {...rest}
        />
      );
    }

    if (prop.type === "string[]") {
      throw new Error(
        `Cannot render a fallback control for prop "${rest.propName}" with type string[], because we don't know the available options for a multiselect control`
      );
    }

    prop satisfies never;
  }

  throw new Error(
    `Unsupported control type "${meta.control}" for prop "${rest.propName}"`
  );
};
