import {
  styled,
  keyframes,
  Collapsible,
  Box,
} from "@webstudio-is/design-system";

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
  from: { width: 0 },
  to: { width: "var(--radix-collapsible-content-width)" },
});

const closeKeyframes = keyframes({
  from: { width: "var(--radix-collapsible-content-width)" },
  to: { width: 0 },
});

const CollapsibleContent = styled(Collapsible.Content, {
  overflow: "hidden",
  flexGrow: "1",
  display: "flex",
  flexDirection: "column",
  '&[data-state="open"]': {
    animation: `${openKeyframes} 200ms $easing$inOutCubic`,
  },
  '&[data-state="closed"]': {
    animation: `${closeKeyframes} 200ms $easing$inOutCubic`,
  },
});

export const SettingsPanel = ({
  children,
  isOpen,
}: {
  children: React.ReactNode;
  isOpen: boolean;
}) => {
  return (
    <CollapsibleRoot open={isOpen}>
      <CollapsibleContent>
        <Box
          css={{
            flexGrow: 1,
            width: 424,
            background: "$loContrast",
            borderRight: "1px solid $slate7",
            position: "relative",
          }}
        >
          {children}
        </Box>
      </CollapsibleContent>
    </CollapsibleRoot>
  );
};
