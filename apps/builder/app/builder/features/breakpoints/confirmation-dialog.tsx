import type { Breakpoint } from "@webstudio-is/sdk";
import {
  theme,
  Button,
  Flex,
  Text,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
} from "@webstudio-is/design-system";

type ConfirmationDialogProps = {
  onAbort: () => void;
  onConfirm: () => void;
  breakpoint: Breakpoint;
  open: boolean;
};

export const ConfirmationDialog = ({
  breakpoint,
  onConfirm,
  onAbort,
  open,
}: ConfirmationDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onAbort()}>
      <DialogContent>
        <DialogTitle>Delete breakpoint</DialogTitle>
        <Flex gap="2" direction="column" css={{ padding: theme.spacing[5] }}>
          <Text>{`Are you sure you want to delete "${breakpoint.label}"?`}</Text>
          <Text>
            {`Deleting a breakpoint will also delete all styles associated with this
        breakpoint.`}
          </Text>
        </Flex>
        <DialogActions>
          <Button color="neutral" onClick={onAbort}>
            Cancel
          </Button>
          <Button onClick={onConfirm} color="destructive">
            Delete
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};
