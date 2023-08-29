import type { EmbedTemplateStyleDecl } from "@webstudio-is/react-sdk";
import * as tc from "./tailwind-classes";

export const getButtonStyles = (
  variant: "outline" | "ghost",
  size: "default" | "sm" | "icon" = "default"
) => {
  const styles: EmbedTemplateStyleDecl[] = [
    // 'inline-flex items-center justify-center rounded-md text-sm font-medium
    // ring-offset-background transition-colors
    // focus-visible:outline-none focus-visible:ring-2
    // focus-visible:ring-ring focus-visible:ring-offset-2
    // disabled:pointer-events-none disabled:opacity-50'
    tc.border(0),
    tc.bg("transparent"),
    tc.inlineFlex(),
    tc.items("center"),
    tc.justify("center"),
    tc.rounded("md"),
    tc.text("sm"),
    tc.font("medium"),
    tc.focusVisible(
      [tc.outline("none"), tc.ring("ring", 2, "background", 2)].flat()
    ),
    tc.state([tc.pointerEvents("none"), tc.opacity(50)].flat(), ":disabled"),
  ].flat();

  let variantStyles: EmbedTemplateStyleDecl[] = [];
  if (variant === "ghost") {
    // hover:bg-accent hover:text-accent-foreground
    variantStyles = [
      tc.state([tc.bg("accent"), tc.text("accentForeground")].flat(), ":hover"),
    ].flat();
  }
  if (variant === "outline") {
    // border border-input bg-background hover:bg-accent hover:text-accent-foreground
    variantStyles = [
      tc.border(),
      tc.border("input"),
      tc.bg("background"),
      tc.state(
        [tc.bg("accent", 90), tc.text("accentForeground")].flat(),
        ":hover"
      ),
    ].flat();
  }

  let sizeStyles: EmbedTemplateStyleDecl[] = [];
  if (size === "icon") {
    // h-10 w-10
    sizeStyles = [tc.h(10), tc.w(10)].flat();
  }
  if (size === "sm") {
    // h-9 rounded-md px-3
    sizeStyles = [tc.h(10), tc.px(3)].flat();
  }
  if (size === "default") {
    // h-10 px-4 py-2
    sizeStyles = [tc.h(10), tc.px(4), tc.py(2)].flat();
  }

  return [...styles, ...variantStyles, ...sizeStyles];
};

export const buttonReset: EmbedTemplateStyleDecl[] = [
  {
    property: "backgroundColor",
    value: { type: "keyword", value: "transparent" },
  } as const,
  {
    property: "backgroundImage",
    value: { type: "keyword", value: "none" },
  } as const,
  tc.border(0),
  tc.p(0),
].flat();
