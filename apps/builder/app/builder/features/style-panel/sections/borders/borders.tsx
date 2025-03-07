import type { CssProperty } from "@webstudio-is/css-engine";
import { StyleSection } from "../../shared/style-section";
import {
  BorderRadius,
  properties as borderRadiusProperties,
} from "./border-radius";
import {
  BorderStyle,
  properties as borderStyleProperties,
} from "./border-style";
import {
  BorderWidth,
  properties as borderWidthProperties,
} from "./border-width";
import {
  BorderColor,
  properties as borderColorProperties,
} from "./border-color";

export const properties = [
  ...borderColorProperties,
  ...borderRadiusProperties,
  ...borderStyleProperties,
  ...borderWidthProperties,
] satisfies CssProperty[];

export const Section = () => {
  return (
    <StyleSection label="Borders" properties={properties}>
      <BorderStyle />
      <BorderColor />
      <BorderWidth />
      <BorderRadius />
    </StyleSection>
  );
};
