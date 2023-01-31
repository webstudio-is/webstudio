import { Flex, FloatingPanelDialog, theme } from "@webstudio-is/design-system";

type DialogProps = {
  title: string;
  children: JSX.Element;
  trigger: JSX.Element;
  onOpenChange?: (open: boolean) => void;
};

export const Dialog = ({
  title,
  children,
  trigger,
  onOpenChange,
}: DialogProps) => {
  return (
    <FloatingPanelDialog.Root onOpenChange={onOpenChange}>
      <FloatingPanelDialog.Trigger asChild>
        {trigger}
      </FloatingPanelDialog.Trigger>
      <FloatingPanelDialog.Content>
        {children}
        <FloatingPanelDialog.Title>{title}</FloatingPanelDialog.Title>
      </FloatingPanelDialog.Content>
    </FloatingPanelDialog.Root>
  );
};

export const ActionsBar = ({ children }: { children: Array<JSX.Element> }) => {
  return (
    <Flex
      gap="1"
      css={{
        padding: theme.spacing["9"],
        paddingTop: theme.spacing["5"],
        // Making sure the tab order is the last item first.
        flexFlow: "row-reverse",
      }}
    >
      {children}
    </Flex>
  );
};

export const Close = FloatingPanelDialog.Close;
