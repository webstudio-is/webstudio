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
import type { Page, Folder } from "@webstudio-is/sdk";

type DeletePageConfirmationDialogProps = {
  onClose: () => void;
  onConfirm: () => void;
  page: Page;
};

export const DeletePageConfirmationDialog = ({
  onClose,
  onConfirm,
  page,
}: DeletePageConfirmationDialogProps) => {
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (isOpen === false) {
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogTitle>Delete page</DialogTitle>
        <Flex gap="3" direction="column" css={{ padding: theme.panel.padding }}>
          <Text>{`Are you sure you want to delete "${page.name}"?`}</Text>
          <Text>
            You can undo it even if you delete the page as long as you don't
            reload.
          </Text>
          <Flex direction="rowReverse" gap="2">
            <DialogClose>
              <Button
                color="destructive"
                onClick={() => {
                  onConfirm();
                }}
              >
                Delete Page
              </Button>
            </DialogClose>
            <DialogClose>
              <Button color="ghost">Cancel</Button>
            </DialogClose>
          </Flex>
        </Flex>
      </DialogContent>
    </Dialog>
  );
};

type DeleteFolderConfirmationDialogProps = {
  onClose: () => void;
  onConfirm: () => void;
  folder: Folder;
};

export const DeleteFolderConfirmationDialog = ({
  onClose,
  onConfirm,
  folder,
}: DeleteFolderConfirmationDialogProps) => {
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (isOpen === false) {
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogTitle>Delete confirmation</DialogTitle>
        <Flex gap="3" direction="column" css={{ padding: theme.panel.padding }}>
          <Text>{`Delete folder "${folder.name}" including all of its pages?`}</Text>
          <Flex direction="rowReverse" gap="2">
            <DialogClose>
              <Button
                color="destructive"
                onClick={() => {
                  onConfirm();
                }}
              >
                Delete
              </Button>
            </DialogClose>
            <DialogClose>
              <Button color="ghost">Cancel</Button>
            </DialogClose>
          </Flex>
        </Flex>
      </DialogContent>
    </Dialog>
  );
};
