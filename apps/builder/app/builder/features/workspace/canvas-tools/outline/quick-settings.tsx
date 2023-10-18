import {
  FloatingPanelPopover,
  FloatingPanelPopoverContent,
  FloatingPanelAnchor,
  FloatingPanelPopoverTrigger,
  theme,
  FloatingPanelPopoverTitle,
  type Rect,
  Flex,
  ScrollArea,
} from "@webstudio-is/design-system";
import { ItemIcon } from "@webstudio-is/icons";
import type { Instance } from "@webstudio-is/sdk";
import {
  useState,
  type ReactNode,
  useRef,
  useCallback,
  type RefObject,
} from "react";
import { SettingsPanelContainer } from "~/builder/features/settings-panel";
import type { Publish } from "~/shared/pubsub";

const useCalcAlignOffset = (
  triggerRef: RefObject<HTMLButtonElement | null>,
  labelRect: Rect
) => {
  return useCallback(() => {
    if (triggerRef.current === null) {
      return 0;
    }
    const triggerRect = triggerRef.current.getBoundingClientRect();
    return triggerRect.left - labelRect.left;
  }, [labelRect.left]);
};

const QuickSettingsPanel = ({
  children,
  title,
  labelRect,
}: {
  children: ReactNode;
  title: string;
  labelRect: Rect;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const calcAlignOffset = useCalcAlignOffset(triggerRef, labelRect);

  return (
    <FloatingPanelPopover modal open={isOpen} onOpenChange={setIsOpen}>
      <FloatingPanelAnchor>
        <FloatingPanelPopoverTrigger
          asChild
          ref={triggerRef}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <ItemIcon />
        </FloatingPanelPopoverTrigger>
      </FloatingPanelAnchor>

      <FloatingPanelPopoverContent
        alignOffset={isOpen ? -calcAlignOffset() : 0}
        align="start"
        css={{
          width: theme.spacing[30],
        }}
      >
        <FloatingPanelPopoverTitle>{title}</FloatingPanelPopoverTitle>
        {children}
      </FloatingPanelPopoverContent>
    </FloatingPanelPopover>
  );
};

type QuickSettingsProps = {
  labelRect: Rect;
  instance?: Instance;
  publish?: Publish;
};

export const QuickSettings = ({
  labelRect,
  instance,
  publish,
}: QuickSettingsProps) => {
  if (publish === undefined || instance === undefined) {
    return;
  }
  return (
    <QuickSettingsPanel
      title={`${instance.component} Settings`}
      labelRect={labelRect}
    >
      <Flex direction={"column"}>
        <ScrollArea>
          <SettingsPanelContainer
            publish={publish}
            selectedInstance={instance}
          />
        </ScrollArea>
      </Flex>
    </QuickSettingsPanel>
  );
};
