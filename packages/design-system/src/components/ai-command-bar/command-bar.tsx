/**
 * Implementation of the "ai command bar" component from:
 * https://www.figma.com/file/xCBegXEWxROLqA1Y31z2Xo/%F0%9F%93%96-Webstudio-Design-Docs?node-id=7586%3A48927&mode=dev
 */
import * as Collapsible from "@radix-ui/react-collapsible";
import * as Separator from "@radix-ui/react-separator";
import { styled, theme } from "../../stitches.config";
import { Grid } from "../grid";
import { Button } from "../button";
import { forwardRef, type ReactNode } from "react";

type Props = {
  children: React.ReactNode;
  content?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// @todo replace with theme variables, as of now they are no ready yet
const borderRadius = 22;
const backgroundColor = "#1D1D1D";
const borderColor = "#323232";
const boxShadow =
  "0px 5px 17px 0px rgba(0, 0, 0, 0.30), 0px 2px 7px 0px rgba(0, 0, 0, 0.10)";

const GridContainer = styled(Grid, {
  gridTemplateColumns: `max-content 1fr`,
  gridAutoColumns: "max-content",
  gridAutoFlow: "column",
  padding: theme.spacing[5],
  borderRadius,
  variants: {
    open: {
      true: {
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderTop: `1px solid ${borderColor}`,
      },
    },
  },
});

const CollapsibleRoot = styled(Collapsible.Root, {
  color: theme.colors.foregroundContrastMain,
  backgroundColor,
  borderRadius,
  border: `1px solid ${borderColor}`,
  boxShadow,
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

export const CommandBarTrigger = forwardRef<
  HTMLButtonElement,
  { children: ReactNode }
>((props, ref) => <Collapsible.Trigger ref={ref} asChild {...props} />);
CommandBarTrigger.displayName = "CommandBarTrigger";

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
  backgroundColor: borderColor,
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

export const CommandBarContentPrompt = (props: {
  children: ReactNode;
  onClick?: () => void;
}) => {
  return (
    <CommandBarContentPromptStyled color="dark" onClick={props.onClick}>
      <CommandBarContentPromptText>
        {props.children}
      </CommandBarContentPromptText>
    </CommandBarContentPromptStyled>
  );
};
