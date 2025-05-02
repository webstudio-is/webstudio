import type { ReactNode } from "react";
import { css, theme, type CSS } from "../stitches.config";
import { Text } from "./text";

const style = css({
  display: "inline-flex",
  borderRadius: theme.borderRadius[3],
  px: theme.spacing[3],
  py: theme.spacing[1],
  height: theme.spacing[9],
  color: theme.colors.foregroundContrastMain,
  alignItems: "center",
  maxWidth: "100%",
  whiteSpace: "nowrap",
  overflow: "hidden",
  // @todo doesn't work in tooltips, needs a workaround
  textOverflow: "ellipsis",
  background: theme.colors.foregroundTextSubtle,
});

export const ProBadge = ({
  css,
  children,
}: {
  children: ReactNode;
  css?: CSS;
}) => {
  return <Text className={style({ css })}>{children}</Text>;
};
