import { css, type TemplateStyleDecl } from "@webstudio-is/template";
import {
  borderRadius,
  borderWidth,
  boxShadow,
  colors,
  fontSize,
  fontSizeLineHeight,
  height,
  opacity,
  spacing,
  weights,
} from "./theme";

// ghost icon button
// 'inline-flex items-center justify-center rounded-md text-sm font-medium
// ring-offset-background transition-colors
// focus-visible:outline-none focus-visible:ring-2
// focus-visible:ring-ring focus-visible:ring-offset-2

// disabled:pointer-events-none disabled:opacity-50'
const buttonStyle = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  border: 0 solid ${colors.border};
  border-radius: ${borderRadius.md};
  font-size: ${fontSize.sm};
  line-height: ${fontSizeLineHeight.sm};
  font-weight: ${weights.medium};
  &:focus-visible {
    outline: 2px solid transparent;
    outline-offset: 2px;
    box-shadow: ${boxShadow.ring};
  }
  &:disabled {
    pointer-events: none;
    opacity: ${opacity[50]};
  }
`;

// hover:bg-accent hover:text-accent-foreground
const ghostButtonStyle = css`
  &:hover {
    background-color: ${colors.accent};
    color: ${colors.accentForeground};
  }
`;

// border border-input bg-background hover:bg-accent hover:text-accent-foreground
const outlineButtonStyle = css`
  border: ${borderWidth.DEFAULT} solid ${colors.input};
  background-color: ${colors.background};
  &:hover {
    background-color: ${colors.accent};
    color: ${colors.accentForeground};
  }
`;

// h-10 px-4 py-2
const defaultButtonStyle = css`
  height: ${height[10]};
  padding: ${spacing[2]} ${spacing[4]};
`;

// h-9 rounded-md px-3
const smButtonStyle = css`
  height: ${height[9]};
  border-radius: ${borderRadius.md};
  padding: 0 ${spacing[3]};
`;

// Set explicit paddings for IOS Safari to prevent the icon from collapsing
// h-10 w-10
const iconButtonStyle = css`
  height: ${spacing[10]};
  width: ${spacing[10]};
  padding: ${spacing[0]} ${spacing[1.5]};
`;

export const getButtonStyle = (
  variant: "outline" | "ghost",
  size: "default" | "sm" | "icon" = "default"
) => {
  const style: TemplateStyleDecl[] = [...buttonStyle];
  if (variant === "ghost") {
    style.push(...ghostButtonStyle);
  }
  if (variant === "outline") {
    style.push(...outlineButtonStyle);
  }
  if (size === "default") {
    style.push(...defaultButtonStyle);
  }
  if (size === "sm") {
    style.push(...smButtonStyle);
  }
  if (size === "icon") {
    style.push(...iconButtonStyle);
  }
  return style;
};
