import { createValueContainer, useValue } from "react-nano-state";
import { Box, Flex, Text, Collapsible } from "@webstudio-is/design-system";
import { ChevronLeftIcon, ChevronRightIcon } from "@webstudio-is/icons";

type CollapsibleSectionProps = {
  label: string;
  children: JSX.Element;
  isOpenDefault?: boolean;
  isOpen?: boolean;
  rightSlot?: JSX.Element;
};

const stateContainer = createValueContainer<{ [label: string]: boolean }>({});

// Preserves the open/close state even when component gets unmounted
const useOpenState = (
  label: string,
  initialValue: boolean
): [boolean, (value: boolean) => void] => {
  const [state, setState] = useValue(stateContainer);
  const isOpen = label in state ? state[label] : initialValue;
  const setIsOpen = (isOpen: boolean) => {
    setState({ ...state, [label]: isOpen });
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
          boxShadow: "0px 1px 0 $colors$panelOutline",
        }}
      >
        <Collapsible.Trigger asChild>
          <Flex
            align="center"
            gap="1"
            justify="between"
            css={{
              py: "$spacing$9",
              px: "$spacing$9",
              color: "$hiContrast",
              cursor: "default",
              userSelect: "none",
            }}
          >
            <Text variant="label">{label}</Text>
            <Flex
              align="center"
              justify="center"
              css={{ marginRight: "-$spacing$3", color: "$slate9" }}
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
              p: "$spacing$9",
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
