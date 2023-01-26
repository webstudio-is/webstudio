import type { Instance } from "@webstudio-is/project-build";
import { getComponentMeta } from "@webstudio-is/react-sdk";
import { forwardRef, type ElementRef, type ComponentProps } from "react";
import { Flex, Text, styled } from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";

const Thumb = styled(Flex, {
  px: theme.spacing[3],
  width: 72,
  height: 72,
  border: `1px solid ${theme.colors.slate6}`,
  userSelect: "none",
  color: theme.colors.hiContrast,
  cursor: "grab",
  "&:hover": {
    background: theme.colors.slate3,
  },
  variants: {
    state: {
      dragging: {
        background: theme.colors.slate3,
      },
    },
  },
});

type ComponentThumbProps = {
  component: Instance["component"];
} & ComponentProps<typeof Thumb>;

export const ComponentThumb = forwardRef<
  ElementRef<typeof Thumb>,
  ComponentThumbProps
>(({ component, ...rest }, ref) => {
  const meta = getComponentMeta(component);
  if (meta === undefined) {
    return null;
  }
  return (
    <Thumb
      direction="column"
      align="center"
      justify="center"
      gap="3"
      ref={ref}
      {...rest}
    >
      <meta.Icon width={30} height={30} />
      <Text>{meta.label}</Text>
    </Thumb>
  );
});

ComponentThumb.displayName = "ComponentThumb";
