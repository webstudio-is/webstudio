import { createValueContainer, useValue } from "react-nano-state";
import { Box, Flex, Text, Collapsible } from "~/shared/design-system";
import { ChevronRightIcon, ChevronLeftIcon } from "~/shared/icons";

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
          boxShadow: "0px 1px 0 $colors$gray6",
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
              ...(isOpenFinal && { paddingBottom: 0 }),
            }}
          >
            {isOpenFinal ? <ChevronDownIcon /> : <ChevronRightIcon />}
            <Text size="1" css={{ fontWeight: "500", flexGrow: 1 }}>
              {label}
            </Text>
            {/* @todo: props panel shows double plus icon when rightSlot is set */}
            {rightSlot}
            <Box css={{ marginRight: -6 }}>
              {isOpenFinal ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </Box>
          </Flex>
        </Collapsible.Trigger>
        <Collapsible.Content asChild>
          <Flex
            gap="3"
            direction="column"
            css={{
              p: "$3",
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
