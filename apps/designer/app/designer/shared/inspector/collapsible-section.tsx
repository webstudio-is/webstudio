import { createValueContainer, useValue } from "react-nano-state";
import {
  Box,
  Flex,
  __DEPRECATED__Text,
  Collapsible,
} from "@webstudio-is/design-system";
import { ChevronDownIcon, ChevronRightIcon } from "@webstudio-is/icons";

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
              py: "$3",
              px: "$3",
              color: "$hiContrast",
              cursor: "default",
            }}
          >
            <__DEPRECATED__Text
              size="1"
              css={{ fontWeight: "500", flexGrow: 1 }}
            >
              {label}
            </__DEPRECATED__Text>
            <Flex
              align="center"
              justify="center"
              css={{ marginRight: -5, opacity: ".4" }}
            >
              {isOpenFinal ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </Flex>
            {rightSlot}
          </Flex>
        </Collapsible.Trigger>
        <Collapsible.Content asChild>
          <Flex
            gap="3"
            direction="column"
            css={{
              p: "$3",
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
