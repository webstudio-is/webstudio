import * as Collapsible from "@radix-ui/react-collapsible";
import * as Separator from "@radix-ui/react-separator";
import { styled, theme } from "../../stitches.config";
import { Grid } from "../grid";
import { Button } from "../button";
import { type ReactNode } from "react";

type Props = {
  children: React.ReactNode;
  content?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const borderRadius = 22;

const GridContainer = styled(Grid, {
  gridTemplateColumns: `max-content 1fr`,
  gridAutoColumns: "max-content",
  gridAutoFlow: "column",
  padding: theme.spacing[5],
  backgroundColor: "#1D1D1D",
  borderRadius,
  variants: {
    open: {
      true: {
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderTop: "1px solid #323232",
      },
    },
  },
});

const CollapsibleRoot = styled(Collapsible.Root, {
  color: theme.colors.foregroundContrastMain,
  backgroundColor: "#1D1D1D",
  borderRadius,
  border: "1px solid #323232",
  boxShadow:
    "0px 5px 17px 0px rgba(0, 0, 0, 0.30), 0px 2px 7px 0px rgba(0, 0, 0, 0.10)",
});

const CollapsibleContent = styled(Collapsible.Content, {
  width: "min-content",
  minWidth: "100%",
});

export const CommandBar = (props: Props) => {
  const open = props.content !== undefined && props.open;
  const onOpenChange =
    props.content !== undefined ? props.onOpenChange : undefined;

  return (
    <CollapsibleRoot open={open} onOpenChange={onOpenChange}>
      <CollapsibleContent>{props.content}</CollapsibleContent>
      <GridContainer gap={2} open={props.open}>
        {props.children}
      </GridContainer>
    </CollapsibleRoot>
  );
};

export const CommandBarTrigger = (props: { children: ReactNode }) => (
  <Collapsible.Trigger asChild {...props} />
);

export const CommandBarContentSection = (props: { children: ReactNode }) => (
  <Grid
    css={{
      margin: theme.spacing[9],
    }}
    gap={2}
    {...props}
  />
);

export const CommandBarContentSeparator = styled(Separator.Root, {
  backgroundColor: "#323232",
  height: 1,
});

const CommandBarContentPromptStyled = styled(Button, {
  justifyContent: "start",
  p: theme.spacing[4],
  height: "auto",
});

const CommandBarContentPromptText = styled("span", {
  overflow: "auto",
  whiteSpace: "break-spaces",
});

export const CommandBarContentPrompt = (props: { children: ReactNode }) => {
  return (
    <CommandBarContentPromptStyled color="dark">
      <CommandBarContentPromptText>
        {props.children}
      </CommandBarContentPromptText>
    </CommandBarContentPromptStyled>
  );
};
