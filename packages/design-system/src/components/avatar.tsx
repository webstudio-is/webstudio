import React from "react";
import { styled, type VariantProps, type CSS } from "../stitches.config";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { Box } from "./box";
import { Status } from "./status";
import { theme } from "../stitches.config";

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
  color: theme.colors.hiContrast,

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
        width: theme.spacing[9],
        height: theme.spacing[9],
      },
      "2": {
        width: theme.spacing[12],
        height: theme.spacing[12],
      },
      "3": {
        width: theme.spacing[13],
        height: theme.spacing[13],
      },
      "4": {
        width: theme.spacing[17],
        height: theme.spacing[17],
      },
      "5": {
        width: theme.spacing[19],
        height: theme.spacing[19],
      },
      "6": {
        width: theme.spacing[20],
        height: theme.spacing[20],
      },
    },
    variant: {
      hiContrast: {
        backgroundColor: theme.colors.hiContrast,
        color: theme.colors.loContrast,
      },
      gray: {
        backgroundColor: theme.colors.slate6,
      },
      tomato: {
        backgroundColor: theme.colors.tomato5,
      },
      red: {
        backgroundColor: theme.colors.red5,
      },
      crimson: {
        backgroundColor: theme.colors.crimson5,
      },
      pink: {
        backgroundColor: theme.colors.pink5,
      },
      plum: {
        backgroundColor: theme.colors.plum5,
      },
      purple: {
        backgroundColor: theme.colors.purple5,
      },
      violet: {
        backgroundColor: theme.colors.violet5,
      },
      indigo: {
        backgroundColor: theme.colors.indigo5,
      },
      blue: {
        backgroundColor: theme.colors.blue5,
      },
      cyan: {
        backgroundColor: theme.colors.cyan5,
      },
      teal: {
        backgroundColor: theme.colors.teal5,
      },
      green: {
        backgroundColor: theme.colors.green5,
      },
      grass: {
        backgroundColor: theme.colors.grass5,
      },
      brown: {
        backgroundColor: theme.colors.brown5,
      },
      bronze: {
        backgroundColor: theme.colors.bronze5,
      },
      gold: {
        backgroundColor: theme.colors.gold5,
      },
      sky: {
        backgroundColor: theme.colors.sky5,
      },
      mint: {
        backgroundColor: theme.colors.mint5,
      },
      lime: {
        backgroundColor: theme.colors.lime5,
      },
      yellow: {
        backgroundColor: theme.colors.yellow5,
      },
      amber: {
        backgroundColor: theme.colors.amber5,
      },
      orange: {
        backgroundColor: theme.colors.orange5,
      },
    },
    shape: {
      square: {
        borderRadius: theme.borderRadius[6],
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
        fontSize: theme.deprecatedFontSize[2],
        lineHeight: theme.deprecatedLineHeight[3],
      },
      "2": {
        fontSize: theme.deprecatedFontSize[4],
      },
      "3": {
        fontSize: theme.deprecatedFontSize[6],
      },
      "4": {
        fontSize: theme.deprecatedFontSize[7],
      },
      "5": {
        fontSize: theme.deprecatedFontSize[8],
      },
      "6": {
        fontSize: theme.deprecatedFontSize[9],
      },
    },
  },
  defaultVariants: {
    size: "2",
  },
});

export const AvatarNestedItem = styled("div", {
  boxShadow: `0 0 0 2px ${theme.colors.loContrast}`,
  borderRadius: "50%",
});

export const AvatarGroup = styled("div", {
  display: "flex",
  flexDirection: "row-reverse",
  [`& ${AvatarNestedItem}:nth-child(n+2)`]: {
    marginRight: `-${theme.spacing[3]}`,
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
              boxShadow: `0 0 0 3px ${theme.colors.loContrast}`,
              borderRadius: theme.borderRadius.round,
              mr: `-${theme.spacing[2]}`,
              mb: `-${theme.spacing[2]}`,
            }}
          >
            <Status
              size={
                (typeof size === "number" && size > 2) ||
                (typeof size === "string" && Number.parseInt(size, 10) > 2)
                  ? "2"
                  : "1"
              }
              variant={status}
            />
          </Box>
        )}
      </Box>
    );
  }
);

Avatar.displayName = "Avatar";
