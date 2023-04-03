/**
 * Implementation of the "Panel Title" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=2647-10046
 */

import { forwardRef, type ReactNode, type Ref } from "react";
import { theme, styled, type CSS } from "../stitches.config";
import { textVariants } from "./text";

type TitleProps = {
  children: ReactNode;
  suffix?: ReactNode;
  className?: string;
  css?: CSS;
};

const Container = styled("div", textVariants.titles, {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  height: theme.spacing[15],
  paddingLeft: theme.spacing[9],
  paddingRight: theme.spacing[5],
  color: theme.colors.foregroundMain,
});

const SuffixSlot = styled("div", {
  display: "flex",
  alignItems: "center",
  marginLeft: theme.spacing[5],
});

// we can't just set a gap on SuffixSlot,
// because we want no gap between icon-buttons
export const TitleSuffixSpacer = styled("div", {
  width: theme.spacing[5],
});

export const PanelTitle = forwardRef(
  (
    { children, suffix, className, css }: TitleProps,
    ref: Ref<HTMLDivElement>
  ) => (
    <Container className={className} css={css} ref={ref}>
      <div>{children}</div>
      {suffix && <SuffixSlot>{suffix}</SuffixSlot>}
    </Container>
  )
);
PanelTitle.displayName = "PanelTitle";
