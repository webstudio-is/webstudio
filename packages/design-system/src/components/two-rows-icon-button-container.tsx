/**
 * Implementation of the "Two Rows Small Icon Button Container" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=1844%3A5860
 */

import { forwardRef, type ReactNode, type Ref } from "react";
import { css, theme, type CSS } from "../stitches.config";

const curveStyles = css({
  fill: theme.colors.borderMain,
  alignSelf: "start",
  variants: { rotated: { true: { transform: "rotate(90deg)" } } },
});

const Curve = ({ rotated }: { rotated?: boolean }) => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 10 10"
    xmlns="http://www.w3.org/2000/svg"
    className={curveStyles({ rotated })}
  >
    <path d="M10 10V6C10 2.68629 7.31371 0 4 0H0V1H4C6.76142 1 9 3.23858 9 6V10H10Z" />
  </svg>
);

const styles = css({
  display: "flex",
  flexDirection: "column",
  width: 19,
  gap: theme.spacing[3],
  alignItems: "center",
});

export const TwoRowsIconButtonContainer = forwardRef(
  (
    {
      children,
      className,
      css,
    }: {
      children?: ReactNode;
      css?: CSS;
      className?: string;
    },
    ref: Ref<HTMLDivElement>
  ) => (
    <div ref={ref} className={styles({ className, css })}>
      <Curve />
      {children}
      <Curve rotated />
    </div>
  )
);
TwoRowsIconButtonContainer.displayName = "TwoRowsIconButtonContainer";
