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
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { PlusIcon } from "@webstudio-is/icons";
import type { Simplify } from "type-fest";

type Label = string;

type HandleOpenStateProps = {
  label: Label;
  isOpen?: boolean;
};

type State = {
  [label: string]: boolean;
};

// Preserves the open/close state even when component gets unmounted
const $state = atom<State>({});

type HandleOpenState = (
  label: Label,
  isOpenForced?: boolean
) => [boolean, (value: boolean) => void];

const CollapsibleSectionContext = createContext<
  | undefined
  | {
      handleOpenState: HandleOpenState;
    }
>(undefined);

export const CollapsibleProvider = ({
  children,
  accordion,
  initialOpen,
}: {
  children: ReactNode;
  accordion?: boolean;
  initialOpen?: Label;
}) => {
  const state = useStore($state);

  // Set initial value for accordion mode.
  // Mutating but should be fine here as an initializer.
  if (initialOpen && initialOpen !== "*" && state[initialOpen] === undefined) {
    state[initialOpen] = true;
  }

  useEffect(() => {
    const newState = { ...state };

    if (initialOpen === "*") {
      for (const key in state) {
        newState[key] = true;
      }
      $state.set(newState);
      return;
    }

    if (accordion) {
      for (const key in state) {
        newState[key] = false;
      }
    }

    if (initialOpen) {
      newState[initialOpen] = true;
    }
    $state.set(newState);
  }, [accordion, initialOpen]);

  const handleOpenState: HandleOpenState = (label, isOpenForced) => {
    if (state[label] === undefined) {
      state[label] = accordion ? false : true;
    }

    const setIsOpen = (isOpen: boolean) => {
      const newState = { ...state };
      if (accordion) {
        for (const key in state) {
          newState[key] = false;
        }
      }
      newState[label] = isOpen;
      $state.set(newState);
    };

    return [isOpenForced ?? state[label], setIsOpen];
  };

  return (
    <CollapsibleSectionContext.Provider value={{ handleOpenState }}>
      {children}
    </CollapsibleSectionContext.Provider>
  );
};

export const useOpenState = ({
  label,
  isOpen,
}: HandleOpenStateProps): [boolean, (value: boolean) => void] => {
  const context = useContext(CollapsibleSectionContext);
  const localState = useState(isOpen ?? true);
  if (context === undefined) {
    return localState;
  }
  return context.handleOpenState(label, isOpen);
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
}: CollapsibleSectionBaseProps) => {
  return (
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
};

type CollapsibleSectionProps = Simplify<
  Omit<CollapsibleSectionBaseProps, "isOpen" | "onOpenChange"> &
    HandleOpenStateProps
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
