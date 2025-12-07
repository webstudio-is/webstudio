import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
  Flex,
  Text,
  Button,
  theme,
} from "@webstudio-is/design-system";
import type { DataSource } from "@webstudio-is/sdk";

type DeleteDataVariableDialogProps = {
  variable?: { id: DataSource["id"]; name: string; usages: number };
  onClose: () => void;
  onConfirm: (variableId: DataSource["id"]) => void;
};

export const DeleteDataVariableDialog = ({
  variable,
  onClose,
  onConfirm,
}: DeleteDataVariableDialogProps) => {
  return (
    <Dialog
      open={variable !== undefined}
      onOpenChange={(isOpen) => {
        if (isOpen === false) {
          onClose();
        }
      }}
    >
      <DialogContent
        onKeyDown={(event) => {
          // Prevent command panel from handling keyboard events
          event.stopPropagation();
        }}
      >
        <DialogTitle>Delete confirmation</DialogTitle>
        <Flex gap="3" direction="column" css={{ padding: theme.panel.padding }}>
          <Text>
            {variable &&
              (variable.usages > 0
                ? `Delete "${variable.name}" variable from the project? It is used in ${variable.usages} ${variable.usages === 1 ? "expression" : "expressions"}.`
                : `Delete "${variable.name}" variable from the project?`)}
          </Text>
          <Flex direction="rowReverse" gap="2">
            <Button
              color="destructive"
              onClick={() => {
                onConfirm(variable!.id);
                onClose();
              }}
            >
              Delete
            </Button>
            <DialogClose>
              <Button color="ghost">Cancel</Button>
            </DialogClose>
          </Flex>
        </Flex>
      </DialogContent>
    </Dialog>
  );
};
