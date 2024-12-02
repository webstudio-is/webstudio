import { styled, Collapsible, Flex } from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";
import { useEffect, useRef } from "react";
import { BindingPopoverProvider } from "~/builder/shared/binding-popover";
import { $canvasToolsVisible } from "~/shared/nano-states";

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

export const ExtendedPanel = ({ children }: { children: React.ReactNode }) => {
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Quick workaround to hide the outline above extended panels.
    // These panels should ideally be implemented as `Sheet`-style dialogs.
    $canvasToolsVisible.set(false);
    return () => {
      $canvasToolsVisible.set(true);
    };
  }, []);

  return (
    <CollapsibleRoot ref={settingsRef} open={true}>
      <CollapsibleContent>
        <Flex
          direction="column"
          grow
          css={{
            position: "relative",
            height: "100%",
            width: theme.spacing[35],
            background: theme.colors.backgroundPanel,
            borderRight: `1px solid ${theme.colors.borderMain}`,
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
