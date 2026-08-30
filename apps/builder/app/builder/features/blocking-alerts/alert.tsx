import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import type { ReactNode } from "react";
import {
  Button,
  css,
  cssVar,
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
  background: `oklch(from ${cssVar("--overlay-scrim")} l c h / 90%)`,
});

const contentStyle = css({
  width: theme.spacing[33],
  color: cssVar("--foreground-negative"),
});

const scrimForeground = `light-dark(
  ${cssVar("--foreground-on-inverse")},
  ${cssVar("--foreground-primary")}
)`;

const $isAlertDismissed = atom(false);

export const Alert = ({
  message,
  isDismissable,
}: {
  message: string | ReactNode;
  isDismissable?: boolean;
}) => {
  const isAlertDismissed = useStore($isAlertDismissed);
  if (isAlertDismissed) {
    return;
  }
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
            <Text align="center" css={{ color: scrimForeground }}>
              {message}
            </Text>
            {isDismissable && (
              <Button
                color="destructive"
                onClick={() => $isAlertDismissed.set(true)}
              >
                Dismiss
              </Button>
            )}
          </Flex>
        </Flex>
      </PopoverContent>
    </Popover>
  );
};
