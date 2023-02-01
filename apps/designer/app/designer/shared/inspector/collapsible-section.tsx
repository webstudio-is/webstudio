import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Box,
  Flex,
  DeprecatedText2,
  Collapsible,
} from "@webstudio-is/design-system";
import { ChevronLeftIcon, ChevronRightIcon } from "@webstudio-is/icons";
import { theme } from "@webstudio-is/design-system";

type CollapsibleSectionProps = {
  label: string;
  children: JSX.Element;
  isOpenDefault?: boolean;
  isOpen?: boolean;
  rightSlot?: JSX.Element;
};

const stateContainer = atom<{ [label: string]: boolean }>({});

// Preserves the open/close state even when component gets unmounted
const useOpenState = (
  label: string,
  initialValue: boolean
): [boolean, (value: boolean) => void] => {
  const state = useStore(stateContainer);
  const isOpen = label in state ? state[label] : initialValue;
  const setIsOpen = (isOpen: boolean) => {
    stateContainer.set({ ...state, [label]: isOpen });
  };
  return [isOpen, setIsOpen];
};

export const CollapsibleSection = ({
  label,
  children,
  isOpenDefault = false,
  isOpen,
  rightSlot,
}: CollapsibleSectionProps) => {
  const [isOpenByUser, setIsOpenByUser] = useOpenState(label, isOpenDefault);
  const isOpenFinal = isOpen === undefined ? isOpenByUser : isOpen;
  return (
    <Collapsible.Root open={isOpenFinal} onOpenChange={setIsOpenByUser}>
      <Box
        css={{
          boxShadow: `0px 1px 0 ${theme.colors.panelOutline}`,
        }}
      >
        <Collapsible.Trigger asChild>
          <Flex
            align="center"
            gap="1"
            justify="between"
            css={{
              py: theme.spacing[9],
              px: theme.spacing[9],
              color: theme.colors.hiContrast,
              cursor: "default",
              userSelect: "none",
            }}
          >
            <DeprecatedText2 variant="label">{label}</DeprecatedText2>
            <Flex
              align="center"
              justify="center"
              css={{
                marginRight: `-${theme.spacing[3]}`,
                color: theme.colors.slate9,
              }}
            >
              {rightSlot}
              {isOpenFinal ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </Flex>
          </Flex>
        </Collapsible.Trigger>
        <Collapsible.Content asChild>
          <Flex
            gap="3"
            direction="column"
            css={{
              p: theme.spacing[9],
              paddingTop: 0,
              "&:empty": {
                display: "none",
              },
            }}
          >
            {children}
          </Flex>
        </Collapsible.Content>
      </Box>
    </Collapsible.Root>
  );
};
