import { forwardRef } from "react";
import { useStore } from "@nanostores/react";
import {
  Flex,
  Text,
  theme,
  focusRingStyle,
  css,
  rawTheme,
} from "@webstudio-is/design-system";
import { Image } from "@webstudio-is/image";
import { SpinnerIcon } from "@webstudio-is/icons";
import { $imageLoader } from "~/shared/nano-states";

const focusOutline = focusRingStyle();

const imageContainerStyle = css({
  position: "relative",
  overflow: "hidden",
  aspectRatio: "1.91",
});

const spinnerStyle = css({
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255, 255, 255, 0.5)",
  backdropFilter: "blur(8px)",
});

const imageStyle = css({
  position: "absolute",
  top: 0,
  width: "100%",
  height: "100%",
  transition: "transform 100ms",
  "&:hover": {
    transform: "scale(1.1)",
  },
  variants: {
    hasAsset: {
      true: {
        objectFit: "cover",
      },
    },
  },
});

type ThumbnailProps = {
  image?: { name: string } | string;
  state?: "loading";
};

const Thumbnail = ({ image, state }: ThumbnailProps) => {
  const imageLoader = useStore($imageLoader);
  return (
    <div className={imageContainerStyle()}>
      {image === "" || image === undefined ? (
        // Will render a placeholder
        <Image loader={imageLoader} className={imageStyle()} />
      ) : typeof image === "string" ? (
        // Its a URL.
        <img src={image} className={imageStyle({ hasAsset: true })} />
      ) : (
        <Image
          src={image.name}
          width={rawTheme.spacing[28]}
          loader={imageLoader}
          className={imageStyle({ hasAsset: true })}
        />
      )}

      {state === "loading" && (
        <div className={spinnerStyle()}>
          <SpinnerIcon size={rawTheme.spacing[15]} />
        </div>
      )}
    </div>
  );
};

type CardProps = {
  image?: ThumbnailProps["image"];
  title?: string;
  suffix?: React.ReactNode;
  state?: "selected" | "loading";
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ image, title, suffix, state = "initial" as const, ...props }, ref) => {
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
          image={image}
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
