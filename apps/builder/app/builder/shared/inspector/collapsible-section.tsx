import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Box,
  Flex,
  Collapsible,
  SectionTitle,
  SectionTitleLabel,
} from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";
import type { ComponentProps, ReactNode } from "react";

type CollapsibleSectionProps = {
  label: string;
  children: ReactNode;
  isOpenDefault?: boolean;
  isOpen?: boolean;
  fullWidth?: boolean;
} & Pick<ComponentProps<typeof SectionTitle>, "onAdd" | "hasItems">;

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
  isOpenDefault = true,
  isOpen,
  fullWidth = false,
  onAdd,
  hasItems,
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
        <SectionTitle
          isOpen={isOpenFinal}
          onOpenChange={setIsOpenByUser}
          onAdd={onAdd}
          hasItems={hasItems}
        >
          <SectionTitleLabel>{label}</SectionTitleLabel>
        </SectionTitle>

        <Collapsible.Content asChild>
          <Flex
            gap="3"
            direction="column"
            css={{
              pb: theme.spacing[9],
              px: fullWidth ? 0 : theme.spacing[9],
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
