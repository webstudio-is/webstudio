import { css, theme, textVariants } from "@webstudio-is/design-system";
import { forwardRef } from "react";
import { Link } from "@remix-run/react";

const thumbnailStyle = css(textVariants.brandThumbnailLargeDefault, {
  display: "flex",
  alignItems: "center",
  alignSelf: "center",
  minHeight: 0,
  background: theme.colors.brandBackgroundProjectCardFront,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  outline: "none",
  "&:hover, &:focus": {
    ...textVariants.brandThumbnailLargeHover,
    transition: "100ms",
  },
});

// My Next Project > MN
const getThumbnailAbbreviation = (title: string) =>
  title
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

export const ThumbnailLink = forwardRef<
  HTMLAnchorElement,
  { title: string; to: string }
>(({ title, to }, ref) => {
  return (
    <Link ref={ref} to={to} className={thumbnailStyle()} tabIndex={-1}>
      {getThumbnailAbbreviation(title)}
    </Link>
  );
});

export const Thumbnail = forwardRef<
  HTMLDivElement,
  { title: string; onClick: React.MouseEventHandler<HTMLDivElement> }
>(({ title, onClick }, ref) => {
  return (
    <div ref={ref} onClick={onClick} className={thumbnailStyle()} tabIndex={-1}>
      {getThumbnailAbbreviation(title)}
    </div>
  );
});

Thumbnail.displayName = "Thumbnail";
ThumbnailLink.displayName = "ThumbnailLink";
