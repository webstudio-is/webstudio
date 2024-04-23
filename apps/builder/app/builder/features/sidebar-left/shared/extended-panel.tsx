import { styled, Collapsible, Flex } from "@webstudio-is/design-system";
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

const CollapsibleContent = styled(Collapsible.Content, {
  overflow: "hidden",
  flexGrow: "1",
  display: "flex",
  flexDirection: "column",
});

export const ExtendedPanel = ({
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
