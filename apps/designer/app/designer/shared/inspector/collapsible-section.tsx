import { createValueContainer, useValue } from "react-nano-state";
import {
  Flex,
  Text,
  Collapsible,
} from "apps/designer/app/shared/design-system";
import {
  TriangleRightIcon,
  TriangleDownIcon,
} from "apps/designer/app/shared/icons";

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
      <Collapsible.Trigger asChild>
        <Flex
          align="center"
          gap="1"
          justify="between"
          css={{
            py: "$3",
            px: "$1",
            color: "$hiContrast",
            cursor: "default",
          }}
        >
          {isOpenFinal ? <TriangleDownIcon /> : <TriangleRightIcon />}
          <Text size="3" css={{ flexGrow: 1 }}>
            {label}
          </Text>
          {rightSlot}
        </Flex>
      </Collapsible.Trigger>
      <Collapsible.Content asChild>
        <Flex
          gap="3"
          direction="column"
          css={{ p: "$2", borderBottom: "1px solid $slate6" }}
        >
          {children}
        </Flex>
      </Collapsible.Content>
    </Collapsible.Root>
  );
};
