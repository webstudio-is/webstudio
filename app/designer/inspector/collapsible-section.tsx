import { useState } from "react";
import { Flex, Text, Collapsible } from "~/shared/design-system";
import { TriangleRightIcon, TriangleDownIcon } from "~/shared/icons";

type CollapsibleSectionProps = {
  label: string;
  children: JSX.Element;
  isOpen?: boolean;
  rightSlot?: JSX.Element;
};

export const CollapsibleSection = ({
  label,
  children,
  isOpen: isOpenDefault = false,
  rightSlot,
}: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(isOpenDefault);
  return (
    <Collapsible.Root onOpenChange={setIsOpen} defaultOpen={isOpen}>
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
          {isOpen ? <TriangleDownIcon /> : <TriangleRightIcon />}
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
