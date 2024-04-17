import { forwardRef } from "react";
import { Link } from "@remix-run/react";
import { Image, type ImageLoader } from "@webstudio-is/image";
import { css, theme, textVariants } from "@webstudio-is/design-system";

const abbrStyle = css(textVariants.brandThumbnailLargeDefault, {
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

export const ThumbnailLinkWithAbbr = forwardRef<
  HTMLAnchorElement,
  { title: string; to: string }
>(({ title, to }, ref) => {
  return (
    <Link ref={ref} to={to} className={abbrStyle()} tabIndex={-1}>
      {getThumbnailAbbreviation(title)}
    </Link>
  );
});
ThumbnailLinkWithAbbr.displayName = "ThumbnailLinkWithAbbr";

export const ThumbnailWithAbbr = forwardRef<
  HTMLDivElement,
  { title: string; onClick: React.MouseEventHandler<HTMLDivElement> }
>(({ title, onClick }, ref) => {
  return (
    <div ref={ref} onClick={onClick} className={abbrStyle()} tabIndex={-1}>
      {getThumbnailAbbreviation(title)}
    </div>
  );
});

ThumbnailWithAbbr.displayName = "ThumbnailWithAbbr";

const imageContainerStyle = css({
  position: "relative",
  background: theme.colors.brandBackgroundProjectCardFront,
  outline: "none",
  overflow: "hidden",
  transition: "transform 100ms",
  "&:hover, &:focus": {
    transform: "scale(1.1)",
  },
});

const imageStyle = css({
  position: "absolute",
  top: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
});

export const ThumbnailLinkWithImage = forwardRef<
  HTMLAnchorElement,
  { name: string; to: string; imageLoader: ImageLoader }
>(({ name, to, imageLoader }, ref) => {
  return (
    <Link ref={ref} to={to} className={imageContainerStyle()} tabIndex={-1}>
      <Image src={name} loader={imageLoader} className={imageStyle()} />
    </Link>
  );
});
ThumbnailLinkWithImage.displayName = "ThumbnailLinkWithImage";

export const ThumbnailWithImage = forwardRef<
  HTMLDivElement,
  {
    name: string;
    onClick: React.MouseEventHandler<HTMLDivElement>;
    imageLoader: ImageLoader;
  }
>(({ name, onClick, imageLoader }, ref) => {
  return (
    <div
      ref={ref}
      onClick={onClick}
      className={imageContainerStyle()}
      tabIndex={-1}
    >
      <Image src={name} loader={imageLoader} className={imageStyle()} />
    </div>
  );
});

ThumbnailWithImage.displayName = "ThumbnailWithImage";
