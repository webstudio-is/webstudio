import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Flex,
  Collapsible,
  SectionTitle,
  SectionTitleLabel,
  SectionTitleButton,
  Separator,
  theme,
} from "@webstudio-is/design-system";
import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
} from "react";
import { PlusIcon } from "@webstudio-is/icons";
import type { Simplify } from "type-fest";

type Label = string;

type UseOpenStateProps = {
  label: Label;
  isOpen?: boolean;
};

export const CollapsibleSectionContext = createContext<{
  accordion?: boolean;
  initialOpen?: Label;
}>({});

const $stateContainer = atom<{
  [label: string]: boolean;
}>({});

// Preserves the open/close state even when component gets unmounted
export const useOpenState = ({
  label,
  isOpen: isOpenForced,
}: UseOpenStateProps): [boolean, (value: boolean) => void] => {
  const state = useStore($stateContainer);
  const { accordion, initialOpen } = useContext(CollapsibleSectionContext);
  const setIsOpen = (isOpen: boolean) => {
    const update = { ...state };
    if (isOpen && accordion) {
      // In accordion mode we close everything else within that accordion.
      for (const key in update) {
        update[key] = false;
      }
    }
    update[label] = isOpen;
    $stateContainer.set(update);
  };

  // Set initial value for accordion mode.
  if (accordion && state[label] === undefined) {
    state[label] = initialOpen === label;
  }

  const isOpenCurrent = state[label];
  return [isOpenForced ?? isOpenCurrent ?? true, setIsOpen];
};

type CollapsibleSectionBaseProps = {
  trigger?: ReactNode;
  children: ReactNode;
  fullWidth?: boolean;
  label: string;
  isOpen: boolean;
  onOpenChange: (value: boolean) => void;
};

export const CollapsibleSectionRoot = ({
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
          gap="2"
          direction="column"
          css={{
            pb: theme.panel.paddingBlock,
            px: fullWidth ? 0 : theme.panel.paddingInline,
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
    <CollapsibleSectionRoot
      label={label}
      trigger={trigger}
      fullWidth={fullWidth}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
    >
      {children}
    </CollapsibleSectionRoot>
  );
};

export const CollapsibleSectionWithAddButton = ({
  onAdd,
  hasItems = true,
  ...props
}: Omit<CollapsibleSectionProps, "trigger" | "categoryProps"> & {
  onAdd?: () => void;

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
    <CollapsibleSectionRoot
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
            onAdd ? (
              <SectionTitleButton
                prefix={<PlusIcon />}
                onClick={() => {
                  if (isOpenFinal === false) {
                    setIsOpen(true);
                  }
                  onAdd();
                }}
              />
            ) : undefined
          }
        >
          <SectionTitleLabel>{props.label}</SectionTitleLabel>
        </SectionTitle>
      }
    >
      {children}
    </CollapsibleSectionRoot>
  );
};
