import { styled, Collapsible, Flex } from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";

const CollapsibleRoot = styled(Collapsible.Root, {
  position: "absolute",
  left: "100%",
  top: 0,
  bottom: 0,
  display: "flex",
  flexDirection: "column",
});

const CollapsibleContent = styled(Collapsible.Content, {
  overflow: "hidden",
  flexGrow: "1",
  display: "flex",
  flexDirection: "column",
});

export const ExtendedPanel = ({ children }: { children: React.ReactNode }) => {
  return (
    <CollapsibleRoot open={true}>
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
          {children}
        </Flex>
      </CollapsibleContent>
    </CollapsibleRoot>
  );
};
