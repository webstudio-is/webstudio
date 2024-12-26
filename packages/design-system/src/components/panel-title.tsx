/**
 * Implementation of the "Panel Title" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=2647-10046
 */

import {
  forwardRef,
  type ComponentProps,
  type ReactNode,
  type Ref,
} from "react";
import { theme, styled, type CSS } from "../stitches.config";
import { Text } from "./text";

type TitleProps = ComponentProps<"div"> & {
  suffix?: ReactNode;
  css?: CSS;
};

const Container = styled("div", {
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
  justifyContent: "space-between",
  height: theme.spacing[15],
  paddingInline: theme.panel.paddingInline,
  paddingRight: theme.spacing[5],
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
    { children, suffix, className, css, ...rest }: TitleProps,
    ref: Ref<HTMLDivElement>
  ) => (
    <Container className={className} css={css} {...rest} ref={ref}>
      {typeof children === "string" ? (
        <Text variant="titles" truncate>
          {children}
        </Text>
      ) : (
        children
      )}
      {suffix && <SuffixSlot>{suffix}</SuffixSlot>}
    </Container>
  )
);
PanelTitle.displayName = "PanelTitle";
