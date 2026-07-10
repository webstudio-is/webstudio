import type { ReactNode } from "react";
import type { CSS } from "../stitches.config";
import { Chip } from "./chip";

const pricingPageUrl = "https://webstudio.is/pricing";

export const ProChip = ({
  css,
  children,
}: {
  children: ReactNode;
  css?: CSS;
}) => {
  return (
    <Chip
      as="a"
      css={css}
      href={pricingPageUrl}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </Chip>
  );
};
