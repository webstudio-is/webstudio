import type { ReactNode } from "react";
import { css, theme, type CSS } from "../stitches.config";
import { Text } from "./text";

const pricingUrl = "https://webstudio.is/pricing";

const style = css({
  display: "inline-flex",
  borderRadius: theme.borderRadius[3],
  px: theme.spacing[3],
  py: theme.spacing[1],
  lineHeight: 1,
  color: theme.colors.foregroundContrastMain,
  alignItems: "center",
  maxWidth: "100%",
  whiteSpace: "nowrap",
  overflow: "hidden",
  // @todo doesn't work in tooltips, needs a workaround
  textOverflow: "ellipsis",
  background: theme.colors.foregroundTextSubtle,
  textDecoration: "none",
  cursor: "pointer",
  pointerEvents: "auto",
  "&:focus-visible": {
    outline: `2px solid ${theme.colors.borderFocus}`,
    outlineOffset: 1,
  },
});

export const ProBadge = ({
  css,
  children,
}: {
  children: ReactNode;
  css?: CSS;
}) => {
  return (
    <Text
      as="a"
      className={style({ css })}
      href={pricingUrl}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      {children}
    </Text>
  );
};
