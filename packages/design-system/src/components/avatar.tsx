import React from "react";
import { styled, VariantProps, CSS } from "../stitches.config";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { Box } from "./box";
import { Status } from "./status";

const StyledAvatar = styled(AvatarPrimitive.Root, {
  alignItems: "center",
  justifyContent: "center",
  verticalAlign: "middle",
  overflow: "hidden",
  userSelect: "none",
  boxSizing: "border-box",
  display: "flex",
  flexShrink: 0,
  position: "relative",
  border: "none",
  fontFamily: "inherit",
  lineHeight: "1",
  margin: "0",
  outline: "none",
  padding: "0",
  fontWeight: "500",
  color: "$hiContrast",

  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: "inherit",
    boxShadow: "inset 0px 0px 1px rgba(0, 0, 0, 0.12)",
  },

  variants: {
    size: {
      "1": {
        width: "$3",
        height: "$3",
      },
      "2": {
        width: "$5",
        height: "$5",
      },
      "3": {
        width: "$6",
        height: "$6",
      },
      "4": {
        width: "$7",
        height: "$7",
      },
      "5": {
        width: "$8",
        height: "$8",
      },
      "6": {
        width: "$9",
        height: "$9",
      },
    },
    variant: {
      hiContrast: {
        backgroundColor: "$hiContrast",
        color: "$loContrast",
      },
      gray: {
        backgroundColor: "$muted",
      },
      tomato: {
        backgroundColor: "$tomato5",
      },
      red: {
        backgroundColor: "$red5",
      },
      crimson: {
        backgroundColor: "$crimson5",
      },
      pink: {
        backgroundColor: "$pink5",
      },
      plum: {
        backgroundColor: "$plum5",
      },
      purple: {
        backgroundColor: "$purple5",
      },
      violet: {
        backgroundColor: "$violet5",
      },
      indigo: {
        backgroundColor: "$indigo5",
      },
      blue: {
        backgroundColor: "$blue5",
      },
      cyan: {
        backgroundColor: "$cyan5",
      },
      teal: {
        backgroundColor: "$teal5",
      },
      green: {
        backgroundColor: "$green5",
      },
      grass: {
        backgroundColor: "$grass5",
      },
      brown: {
        backgroundColor: "$brown5",
      },
      bronze: {
        backgroundColor: "$bronze5",
      },
      gold: {
        backgroundColor: "$gold5",
      },
      sky: {
        backgroundColor: "$sky5",
      },
      mint: {
        backgroundColor: "$mint5",
      },
      lime: {
        backgroundColor: "$lime5",
      },
      yellow: {
        backgroundColor: "$yellow5",
      },
      amber: {
        backgroundColor: "$amber5",
      },
      orange: {
        backgroundColor: "$orange5",
      },
    },
    shape: {
      square: {
        borderRadius: "$2",
      },
      circle: {
        borderRadius: "50%",
      },
    },
    inactive: {
      true: {
        opacity: ".3",
      },
    },
    interactive: {
      true: {
        "&::after": {
          content: '""',
          position: "absolute",
          top: "0",
          right: "0",
          bottom: "0",
          left: "0",
          backgroundColor: "rgba(0,0,0,.08)",
          opacity: "0",
          pointerEvents: "none",
          transition: "opacity 25ms linear",
        },
        "@hover": {
          "&:hover": {
            "&::after": {
              opacity: "1",
            },
          },
        },
        '&[data-state="open"]': {
          "&::after": {
            backgroundColor: "rgba(0,0,0,.12)",
            opacity: "1",
          },
        },
      },
    },
  },
  defaultVariants: {
    size: "2",
    variant: "gray",
    shape: "circle",
  },
});

const StyledAvatarImage = styled(AvatarPrimitive.Image, {
  display: "flex",
  objectFit: "cover",
  boxSizing: "border-box",
  height: "100%",
  verticalAlign: "middle",
  width: "100%",
});

const StyledAvatarFallback = styled(AvatarPrimitive.Fallback, {
  textTransform: "uppercase",
  borderRadius: "50%",
  variants: {
    size: {
      "1": {
        fontSize: "10px",
        lineHeight: "15px",
      },
      "2": {
        fontSize: "$3",
      },
      "3": {
        fontSize: "$6",
      },
      "4": {
        fontSize: "$7",
      },
      "5": {
        fontSize: "$8",
      },
      "6": {
        fontSize: "$9",
      },
    },
  },
  defaultVariants: {
    size: "2",
  },
});

export const AvatarNestedItem = styled("div", {
  boxShadow: "0 0 0 2px $colors$loContrast",
  borderRadius: "50%",
});

export const AvatarGroup = styled("div", {
  display: "flex",
  flexDirection: "row-reverse",
  [`& ${AvatarNestedItem}:nth-child(n+2)`]: {
    marginRight: "-$1",
  },
});

type StatusVariants = React.ComponentProps<typeof Status>;
type StatusColors = Pick<StatusVariants, "variant">;

type AvatarVariants = VariantProps<typeof StyledAvatar>;
type AvatarPrimitiveProps = React.ComponentProps<typeof AvatarPrimitive.Root>;
type AvatarOwnProps = AvatarPrimitiveProps &
  AvatarVariants & {
    css?: CSS;
    alt?: string;
    src?: string;
    fallback?: React.ReactNode;
    status?: StatusColors["variant"];
  };

export const Avatar = React.forwardRef<
  React.ElementRef<typeof StyledAvatar>,
  AvatarOwnProps
>(
  (
    { alt, src, fallback, size, variant, shape, css, status, ...props },
    forwardedRef
  ) => {
    return (
      <Box
        css={{
          ...css,
          position: "relative",
          height: "fit-content",
          width: "fit-content",
        }}
      >
        <StyledAvatar
          {...props}
          ref={forwardedRef}
          size={size}
          variant={variant}
          shape={shape}
        >
          <StyledAvatarImage alt={alt} src={src} />
          <StyledAvatarFallback size={size}>{fallback}</StyledAvatarFallback>
        </StyledAvatar>
        {status && (
          <Box
            css={{
              position: "absolute",
              bottom: "0",
              right: "0",
              boxShadow: "0 0 0 3px $colors$loContrast",
              borderRadius: "$round",
              mr: "-3px",
              mb: "-3px",
            }}
          >
            <Status size={size && size > 2 ? "2" : "1"} variant={status} />
          </Box>
        )}
      </Box>
    );
  }
);

Avatar.displayName = "Avatar";
