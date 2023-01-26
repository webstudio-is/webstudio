/**
 * Implementation of the "Title" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=2%3A12361
 */

import { type ReactNode } from "react";
import { theme, styled } from "../stitches.config";
import { typography } from "./typography";

type TitleProps = {
  children: ReactNode;
  suffix?: ReactNode;
};

const Container = styled("div", typography.title, {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  height: theme.spacing[15],
  paddingLeft: theme.spacing[9],
  paddingRight: theme.spacing[5],
  color: theme.colors.foregroundMain,
  background: theme.colors.backgroundPanel,
});

const SuffixSlot = styled("div", {
  display: "flex",
  alignItems: "center",
  marginLeft: theme.spacing[5],
});

// we can't just set gap on SuffixSlot,
// because we want no gap between icon-buttons
export const TitleSuffixSpacer = styled("div", {
  width: theme.spacing[5],
});

export const Title = ({ children, suffix }: TitleProps) => (
  <Container>
    <div>{children}</div>
    {suffix && <SuffixSlot>{suffix}</SuffixSlot>}
  </Container>
);
