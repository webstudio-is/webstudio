import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Flex,
  Collapsible,
  SectionTitle,
  SectionTitleLabel,
  SectionTitleButton,
  Separator,
} from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";
import type { ComponentProps, ReactNode } from "react";
import { PlusIcon } from "@webstudio-is/icons";
import type { Simplify } from "type-fest";

type UseOpenStateProps = {
  label: string;
  isOpenDefault?: boolean;
  isOpen?: boolean;
};

const stateContainer = atom<{ [label: string]: boolean }>({});

// Preserves the open/close state even when component gets unmounted
export const useOpenState = ({
  label,
  isOpenDefault = true,
  isOpen: isOpenForced,
}: UseOpenStateProps): [boolean, (value: boolean) => void] => {
  const state = useStore(stateContainer);
  const isOpen = label in state ? state[label] : isOpenDefault;
  const setIsOpen = (isOpen: boolean) => {
    stateContainer.set({ ...state, [label]: isOpen });
  };
  return [isOpenForced === undefined ? isOpen : isOpenForced, setIsOpen];
};

type CollapsibleSectionBaseProps = {
  trigger?: ReactNode;
  children: ReactNode;
  fullWidth?: boolean;
  label: string;
  isOpen: boolean;
  onOpenChange: (value: boolean) => void;
};

export const CollapsibleSectionBase = ({
  label,
  trigger,
  children,
  fullWidth = false,
  isOpen,
  onOpenChange,
}: CollapsibleSectionBaseProps) => (
  <Collapsible.Root open={isOpen} onOpenChange={onOpenChange}>
    <>
      <Collapsible.Trigger asChild>
        {trigger ?? (
          <SectionTitle>
            <SectionTitleLabel>{label}</SectionTitleLabel>
          </SectionTitle>
        )}
      </Collapsible.Trigger>

      <Collapsible.Content asChild>
        <Flex
          gap="3"
          direction="column"
          css={{
            pb: theme.spacing[9],
            px: fullWidth ? 0 : theme.spacing[9],
            paddingTop: 0,
            "&:empty": { display: "none" },
          }}
        >
          {children}
        </Flex>
      </Collapsible.Content>
      <Separator />
    </>
  </Collapsible.Root>
);

type CollapsibleSectionProps = Simplify<
  Omit<CollapsibleSectionBaseProps, "isOpen" | "onOpenChange"> &
    UseOpenStateProps
>;

export const CollapsibleSection = (props: CollapsibleSectionProps) => {
  const { label, trigger, children, fullWidth } = props;
  const [isOpen, setIsOpen] = useOpenState(props);
  return (
    <CollapsibleSectionBase
      label={label}
      trigger={trigger}
      fullWidth={fullWidth}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
    >
      {children}
    </CollapsibleSectionBase>
  );
};

export const CollapsibleSectionWithAddButton = ({
  onAdd,
  hasItems = true,
  ...props
}: Omit<CollapsibleSectionProps, "trigger" | "categoryProps"> & {
  onAdd: () => void;

  /**
   * If set to `true`, dots aren't shown,
   * but still affects how isOpen is treated and whether onAdd is called on open.
   */
  hasItems?: boolean | ComponentProps<typeof SectionTitle>["dots"];
}) => {
  const { label, children } = props;
  const [isOpen, setIsOpen] = useOpenState(props);

  const isEmpty =
    hasItems === false || (Array.isArray(hasItems) && hasItems.length === 0);

  // If it's open but empty, we want it to look as closed
  const isOpenFinal = isOpen && isEmpty === false;

  return (
    <CollapsibleSectionBase
      label={label}
      fullWidth={false}
      isOpen={isOpenFinal}
      onOpenChange={(nextIsOpen) => {
        setIsOpen(nextIsOpen);
        if (isEmpty) {
          onAdd?.();
        }
      }}
      trigger={
        <SectionTitle
          dots={Array.isArray(hasItems) ? hasItems : []}
          suffix={
            <SectionTitleButton
              prefix={<PlusIcon />}
              onClick={() => {
                if (isOpenFinal === false) {
                  setIsOpen(true);
                }
                onAdd();
              }}
            />
          }
        >
          <SectionTitleLabel>{props.label}</SectionTitleLabel>
        </SectionTitle>
      }
    >
      {children}
    </CollapsibleSectionBase>
  );
};
