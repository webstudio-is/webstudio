import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Flex,
  Collapsible,
  SectionTitle,
  SectionTitleLabel,
  SectionTitleButton,
  Separator,
  css,
  cssVar,
  theme,
} from "@webstudio-is/design-system";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { PlusIcon } from "@webstudio-is/icons";
import type { Simplify } from "type-fest";

type Label = string;

const sectionStyle = css({
  variants: {
    background: {
      true: { background: cssVar("--background-primary") },
    },
    sticky: {
      true: { position: "sticky", bottom: 0, zIndex: 1 },
    },
  },
});

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
      sectionBackground: boolean;
    }
>(undefined);

export const CollapsibleProvider = ({
  children,
  accordion,
  initialOpen,
  sectionBackground = false,
}: {
  children: ReactNode;
  accordion?: boolean;
  initialOpen?: Label;
  sectionBackground?: boolean;
}) => {
  const state = useStore($state);
  useEffect(() => {
    const nextState = { ...$state.get() };

    if (initialOpen === "*") {
      for (const key in nextState) {
        nextState[key] = true;
      }
      $state.set(nextState);
      return;
    }

    if (accordion) {
      for (const key in nextState) {
        nextState[key] = false;
      }
    }

    if (initialOpen) {
      nextState[initialOpen] = true;
    }
    $state.set(nextState);
  }, [accordion, initialOpen]);

  const handleOpenState: HandleOpenState = useCallback(
    (label, isOpenForced) => {
      const nextState = { ...state };
      if (nextState[label] === undefined) {
        nextState[label] = accordion ? false : true;
      }

      const setIsOpen = (isOpen: boolean) => {
        if (accordion) {
          for (const key in nextState) {
            nextState[key] = false;
          }
        }
        nextState[label] = isOpen;
        $state.set(nextState);
      };

      return [isOpenForced ?? nextState[label], setIsOpen];
    },
    [state, accordion]
  );

  return (
    <CollapsibleSectionContext.Provider
      value={{ handleOpenState, sectionBackground }}
    >
      {children}
    </CollapsibleSectionContext.Provider>
  );
};

export const useOpenState: HandleOpenState = (label, isOpen) => {
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
  showSeparator?: boolean;
  label?: string;
  isOpen?: boolean;
  onOpenChange?: (value: boolean) => void;
  sticky?: boolean;
};

export const CollapsibleSectionRoot = ({
  label,
  trigger,
  children,
  fullWidth = false,
  showSeparator = true,
  isOpen,
  onOpenChange,
  sticky,
}: CollapsibleSectionBaseProps) => {
  const sectionBackground =
    useContext(CollapsibleSectionContext)?.sectionBackground ?? false;
  return (
    <Collapsible.Root
      defaultOpen
      open={isOpen}
      onOpenChange={onOpenChange}
      className={sectionStyle({ background: sectionBackground, sticky })}
    >
      <Collapsible.Trigger asChild>
        {trigger ?? (
          <SectionTitle>
            <SectionTitleLabel>{label ?? ""}</SectionTitleLabel>
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
      {showSeparator && <Separator />}
    </Collapsible.Root>
  );
};

type CollapsibleSectionProps = Simplify<
  Omit<CollapsibleSectionBaseProps, "onOpenChange"> & {
    label: Label;
  }
>;

export const CollapsibleSection = (props: CollapsibleSectionProps) => {
  const { label, trigger, children, fullWidth, showSeparator, sticky } = props;
  const [isOpen, setIsOpen] = useOpenState(label, props.isOpen);
  return (
    <CollapsibleSectionRoot
      label={label}
      trigger={trigger}
      fullWidth={fullWidth}
      showSeparator={showSeparator}
      sticky={sticky}
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
  const [isOpen, setIsOpen] = useOpenState(label, props.isOpen);

  const isEmpty =
    hasItems === false || (Array.isArray(hasItems) && hasItems.length === 0);

  // If it's open but empty, we want it to look as closed
  const isOpenFinal = isOpen && isEmpty === false;

  return (
    <CollapsibleSectionRoot
      label={label}
      fullWidth={props.fullWidth}
      showSeparator={props.showSeparator}
      sticky={props.sticky}
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
