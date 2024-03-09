import {
  Flex,
  Text,
  theme,
  focusRingStyle,
  css,
  rawTheme,
} from "@webstudio-is/design-system";
import env from "~/shared/env";
import { Image, createImageLoader } from "@webstudio-is/image";
import { forwardRef } from "react";
import { SpinnerIcon } from "@webstudio-is/icons";

const focusOutline = focusRingStyle();

const imageLoader = createImageLoader({
  imageBaseUrl: env.IMAGE_BASE_URL,
});

const imageContainerStyle = css({
  position: "relative",
  overflow: "hidden",
  aspectRatio: "1.91",
  "&[data-state=loading]": {
    "--ws-marketplace-card-spinner-display": "block",
  },
});

const spinnerStyle = css({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  display: `var(--ws-marketplace-card-spinner-display, none)`,
});

const imageStyle = css({
  position: "absolute",
  top: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  transition: "transform 100ms",
  "&:hover": {
    transform: "scale(1.1)",
  },
});

type ThumbnailProps = {
  image?: { name: string } | string;
  state?: "loading";
};

const Thumbnail = ({ image, state }: ThumbnailProps) => {
  return (
    <div className={imageContainerStyle()} data-state={state}>
      {typeof image === "string" ? (
        <img src={image} className={imageStyle()} />
      ) : image !== undefined ? (
        <Image src={image.name} loader={imageLoader} className={imageStyle()} />
      ) : undefined}
      <SpinnerIcon className={spinnerStyle()} size={rawTheme.spacing[15]} />
    </div>
  );
};

type CardProps = {
  thumbnail?: ThumbnailProps["image"];
  title?: string;
  suffix?: React.ReactNode;
  state?: "selected" | "loading";
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ thumbnail, title, suffix, state = "initial" as const, ...props }, ref) => {
    return (
      <Flex
        {...props}
        ref={ref}
        direction="column"
        data-state={state}
        css={{
          px: theme.spacing[9],
          py: theme.spacing[5],
          position: "relative",
          overflow: "hidden",
          outline: "none",
          "&:focus-visible, &:hover, &[data-state=selected]": focusOutline,
        }}
        gap="1"
      >
        <Thumbnail
          image={thumbnail}
          state={state === "loading" ? state : undefined}
        />
        <Flex align="center">
          <Text truncate css={{ flexGrow: 1 }}>
            {title}
          </Text>
          {suffix}
        </Flex>
      </Flex>
    );
  }
);

Card.displayName = "Card";
