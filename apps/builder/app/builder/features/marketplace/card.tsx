import { forwardRef } from "react";
import {
  Flex,
  Text,
  theme,
  focusRingStyle,
  css,
  rawTheme,
} from "@webstudio-is/design-system";
import { Image, wsImageLoader } from "@webstudio-is/image";
import { SpinnerIcon } from "@webstudio-is/icons";

const focusOutline = focusRingStyle();

const imageContainerStyle = css({
  position: "relative",
  overflow: "hidden",
  aspectRatio: "1.91",
  borderRadius: theme.borderRadius[4],
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
      false: {
        background: theme.colors.white,
        padding: rawTheme.spacing[5],
      },
    },
  },
});

type ThumbnailProps = {
  image?: { name: string } | string;
  state?: "loading";
  alt: string;
};

const Thumbnail = ({ image, state, alt }: ThumbnailProps) => {
  return (
    <Flex className={imageContainerStyle()}>
      {image === "" || image === undefined ? (
        // Placeholder
        <Flex
          align="center"
          justify="center"
          className={imageStyle({ hasAsset: false })}
        >
          <Text variant="brandSectionTitle">{alt}</Text>
        </Flex>
      ) : typeof image === "string" ? (
        // Its a URL.
        <img src={image} className={imageStyle({ hasAsset: true })} />
      ) : (
        <Image
          src={image.name}
          width={rawTheme.spacing[28]}
          loader={wsImageLoader}
          className={imageStyle({ hasAsset: true })}
        />
      )}

      {state === "loading" && (
        <div className={spinnerStyle()}>
          <SpinnerIcon size={rawTheme.spacing[15]} />
        </div>
      )}
    </Flex>
  );
};

type CardProps = {
  image?: ThumbnailProps["image"];
  title?: string;
  suffix?: React.ReactNode;
  state?: "selected" | "loading";
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { image, title = "Untitled", suffix, state = "initial" as const, ...props },
    ref
  ) => {
    return (
      <Flex
        {...props}
        ref={ref}
        direction="column"
        data-state={state}
        css={{
          padding: theme.panel.padding,
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
          alt={title}
        />
        <Flex align="center">
          <Text truncate css={{ flexGrow: 1 }}>
            {image === undefined || image === "" ? undefined : title}
          </Text>
          {suffix}
        </Flex>
      </Flex>
    );
  }
);

Card.displayName = "Card";
