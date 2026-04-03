import {
  type ComponentProps,
  type ElementRef,
  type ReactNode,
  forwardRef,
} from "react";
import { theme, styled, type CSS } from "../stitches.config";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { Box } from "./box";

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
  fontSize: 14,
  lineHeight: "1",
  margin: "0",
  outline: "none",
  padding: "0",
  fontWeight: "500",
  width: 24,
  height: 24,
  backgroundColor: theme.colors.foregroundSubtle,
  borderRadius: "50%",
  '&[data-size="small"]': {
    width: 16,
    height: 16,
    fontSize: 9,
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
  color: theme.colors.white,
});

type AvatarPrimitiveProps = ComponentProps<typeof AvatarPrimitive.Root>;
type AvatarOwnProps = AvatarPrimitiveProps & {
  css?: CSS;
  alt?: string;
  src?: string;
  fallback?: ReactNode;
  size?: "small";
};

export const Avatar = forwardRef<
  ElementRef<typeof StyledAvatar>,
  AvatarOwnProps
>(({ alt, src, fallback, css, size, ...props }, forwardedRef) => {
  return (
    <Box
      css={{
        ...css,
        position: "relative",
        height: "fit-content",
        width: "fit-content",
      }}
    >
      <StyledAvatar {...props} data-size={size} ref={forwardedRef}>
        <StyledAvatarImage alt={alt} src={src} />
        <StyledAvatarFallback>{fallback}</StyledAvatarFallback>
      </StyledAvatar>
    </Box>
  );
});

Avatar.displayName = "Avatar";
