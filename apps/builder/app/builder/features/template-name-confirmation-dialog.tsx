import { useStore } from "@nanostores/react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Text,
  theme,
} from "@webstudio-is/design-system";
import {
  $pendingTemplateNameConfirmation,
  abortPendingTemplateNameConfirmation,
  confirmPendingTemplateNameChange,
} from "~/shared/instance-utils/data";

export const TemplateNameConfirmationDialog = () => {
  const pending = useStore($pendingTemplateNameConfirmation);
  const action = pending?.confirmation.action;
  return (
    <Dialog
      open={pending !== undefined}
      onOpenChange={(open) => {
        if (open === false) {
          abortPendingTemplateNameConfirmation();
        }
      }}
    >
      <DialogContent>
        <DialogTitle suffix={false}>
          {action === "delete" ? "Delete template" : "Rename template"}
        </DialogTitle>
        <DialogDescription asChild>
          <Text css={{ padding: theme.spacing[5] }}>
            {action === "delete"
              ? "Deleting this template may disconnect references in connected MDX files. The files will not be changed."
              : "Renaming this template may disconnect references in connected MDX files. The files will not be changed."}
          </Text>
        </DialogDescription>
        <DialogActions>
          <Button
            autoFocus
            color="neutral"
            onClick={abortPendingTemplateNameConfirmation}
          >
            Abort
          </Button>
          <Button
            color={action === "delete" ? "destructive" : "primary"}
            onClick={confirmPendingTemplateNameChange}
          >
            {action === "delete" ? "Delete" : "Rename"}
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};
