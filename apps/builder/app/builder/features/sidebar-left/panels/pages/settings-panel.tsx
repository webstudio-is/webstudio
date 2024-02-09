import {
  styled,
  keyframes,
  Collapsible,
  Flex,
} from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";
import { useRef } from "react";
import { BindingPopoverProvider } from "~/builder/shared/binding-popover";

const CollapsibleRoot = styled(Collapsible.Root, {
  position: "absolute",
  left: "100%",
  top: 0,
  bottom: 0,
  display: "flex",
  flexDirection: "column",
  marginLeft: 1,
});

const openKeyframes = keyframes({
  from: {
    opacity: 0.5,
    transform: `translateX(-${theme.spacing[30]})`,
  },
  to: {
    transform: "translateX(0)",
    opacity: 1,
  },
});

const closeKeyframes = keyframes({
  from: {
    transform: "translateX(0)",
    opacity: 1,
  },
  to: {
    opacity: 0.2,
    transform: `translateX(-${theme.spacing[30]})`,
  },
});

const CollapsibleContent = styled(Collapsible.Content, {
  overflow: "hidden",
  flexGrow: "1",
  display: "flex",
  flexDirection: "column",
  '&[data-state="open"]': {
    animation: `${openKeyframes} 200ms ${theme.easing.easeOutQuart}`,
  },
  '&[data-state="closed"]': {
    animation: `${closeKeyframes} 200ms ${theme.easing.easeOutQuart}`,
  },
});

export const SettingsPanel = ({
  children,
  isOpen,
}: {
  children: React.ReactNode;
  isOpen: boolean;
}) => {
  const settingsRef = useRef<HTMLDivElement>(null);
  return (
    <CollapsibleRoot ref={settingsRef} open={isOpen}>
      <CollapsibleContent>
        <Flex
          direction="column"
          grow
          css={{
            position: "relative",
            height: "100%",
            width: theme.spacing[35],
            background: theme.colors.backgroundPanel,
            borderRight: `1px solid ${theme.colors.slate7}`,
          }}
        >
          <BindingPopoverProvider
            value={{ containerRef: settingsRef, side: "right" }}
          >
            {children}
          </BindingPopoverProvider>
        </Flex>
      </CollapsibleContent>
    </CollapsibleRoot>
  );
};
