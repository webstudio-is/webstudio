/** Uses React's runtime with JSX types widened only for template definitions. */
export { Fragment, jsx, jsxs } from "react/jsx-runtime";
import type { JSX as ReactJSX, ReactNode } from "react";
import type {
  ActionValue,
  AssetValue,
  PageValue,
  Parameter,
  PlaceholderValue,
  ResourceValue,
  Token,
  Variable,
} from "./jsx";
import type { TemplateStyleDecl } from "./css";

type Expression = ReturnType<typeof import("./jsx").expression>;

type TemplateValue =
  | ActionValue
  | AssetValue
  | Expression
  | PageValue
  | Parameter
  | ResourceValue
  | Variable;

type TemplateChild = ReactNode | Expression | PlaceholderValue;

type TemplateProps<Props> = {
  [Name in keyof Props]?: Name extends "children"
    ? TemplateChild | TemplateChild[]
    : Props[Name] | TemplateValue;
} & {
  "ws:id"?: string;
  "ws:label"?: string;
  "ws:tag"?: string;
  "ws:style"?: TemplateStyleDecl[];
  "ws:tokens"?: Token[];
  "ws:show"?: boolean | Expression;
};

export namespace JSX {
  export type Element = ReactJSX.Element;
  export type ElementType = ReactJSX.ElementType;
  export type ElementClass = ReactJSX.ElementClass;
  export interface ElementAttributesProperty
    extends ReactJSX.ElementAttributesProperty {}
  export interface ElementChildrenAttribute
    extends ReactJSX.ElementChildrenAttribute {}
  export type LibraryManagedAttributes<Component, Props> = TemplateProps<
    ReactJSX.LibraryManagedAttributes<Component, Props>
  >;
  export type IntrinsicAttributes = ReactJSX.IntrinsicAttributes;
  export type IntrinsicClassAttributes<Instance> =
    ReactJSX.IntrinsicClassAttributes<Instance>;
  export type IntrinsicElements = {
    [Name in keyof ReactJSX.IntrinsicElements]: TemplateProps<
      ReactJSX.IntrinsicElements[Name]
    >;
  };
}
