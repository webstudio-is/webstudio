import { css, theme, textVariants } from "@webstudio-is/design-system";
import { forwardRef } from "react";
import { Link } from "@remix-run/react";
import { Loading } from "../loading-state";
import { useNavigation } from "@remix-run/react";

const thumbnailStyle = css(textVariants.brandThumbnailLargeDefault, {
  position: "relative",
  display: "flex",
  alignItems: "center",
  alignSelf: "center",
  minHeight: 0,
  background: theme.colors.brandBackgroundProjectCardFront,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  userSelect: "none",
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
  const { state, location } = useNavigation();
  const shouldShowLoading = state !== "idle" && to === location?.pathname;
  return (
    <Link ref={ref} to={to} className={thumbnailStyle()} tabIndex={-1}>
      {shouldShowLoading && <Loading delay={600} />}
      {getThumbnailAbbreviation(title)}
    </Link>
  );
});

ThumbnailLink.displayName = "ThumbnailLink";
