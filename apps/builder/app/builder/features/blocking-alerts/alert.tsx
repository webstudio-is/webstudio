import type { ReactNode } from "react";
import {
  css,
  Flex,
  Popover,
  PopoverContent,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { AlertIcon } from "@webstudio-is/icons";

const containerStyle = css({
  position: "absolute",
  top: theme.spacing[15],
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0, 0, 0, 0.9)",
});

const contentStyle = css({
  width: theme.spacing[33],
  color: theme.colors.foregroundDestructive,
});

export const Alert = ({ message }: { message: string | ReactNode }) => {
  return (
    <Popover open>
      <PopoverContent css={{ zIndex: theme.zIndices.max }}>
        <Flex align="center" justify="center" className={containerStyle()}>
          <Flex
            direction="column"
            align="center"
            gap="2"
            className={contentStyle()}
          >
            <AlertIcon size={22} />
            <Text color="contrast" align="center">
              {message}
            </Text>
          </Flex>
        </Flex>
      </PopoverContent>
    </Popover>
  );
};
