/**
 * Some helpers for stories
 */

import { type ReactNode } from "react";
import { theme, css } from "../stitches.config";
import { typography } from "./typography";

const sectionStyle = css({
  marginBottom: theme.spacing[10],
  variants: {
    withBorder: {
      true: {
        border: `1px dashed ${theme.colors.borderMain}`,
        padding: theme.spacing[5],
        marginBottom: theme.spacing[7],
      },
    },
  },
});
const titleStyle = css(typography.title, {
  marginTop: 0,
  marginBottom: theme.spacing[5],
  color: theme.colors.foregroundMain,
});
export const StorySection = ({
  title,
  withBorder,
  children,
}: {
  title: string;
  withBorder?: boolean;
  children: ReactNode;
}) => (
  <section className={sectionStyle({ withBorder })}>
    <h3 className={titleStyle()}>{title}</h3>
    {children}
  </section>
);

const gridStyle = css({
  display: "flex",
  flexWrap: "wrap",
  gap: theme.spacing[7],
  flexDirection: "column",
  variants: { horizontal: { true: { flexDirection: "row" } } },
});
export const StoryGrid = ({
  children,
  horizontal,
}: {
  children: ReactNode;
  horizontal?: boolean;
}) => <div className={gridStyle({ horizontal })}>{children}</div>;
