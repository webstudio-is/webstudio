import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Flex,
  theme,
} from "@webstudio-is/design-system";
import { DialogRadioOptions } from "./dialog-radio-options";

export type DesignTokenImportTarget = "design-token" | "css-variable";
export type DesignTokenImportDialogResult = DesignTokenImportTarget | "cancel";

const importTargetOptions = [
  {
    value: "design-token",
    label: "Design tokens",
    description:
      "Create reusable style tokens for composite and unambiguous values. Keep other primitive values as CSS variables.",
  },
  {
    value: "css-variable",
    label: "CSS variables",
    description:
      "Create custom properties that can be used in individual styles.",
  },
] as const satisfies ReadonlyArray<{
  value: DesignTokenImportTarget;
  label: string;
  description: string;
}>;

type DialogState =
  | {
      target: DesignTokenImportTarget;
      resolve: (result: DesignTokenImportDialogResult) => void;
    }
  | undefined;

const $dialogState = atom<DialogState>(undefined);

export const showDesignTokenImportDialog = () =>
  new Promise<DesignTokenImportDialogResult>((resolve) => {
    $dialogState.get()?.resolve("cancel");
    $dialogState.set({ target: "design-token", resolve });
  });

export const DesignTokenImportDialog = () => {
  const dialogState = useStore($dialogState);

  if (dialogState === undefined) {
    return;
  }

  const { resolve, target } = dialogState;
  const close = () => {
    if ($dialogState.get()?.resolve === resolve) {
      $dialogState.set(undefined);
    }
  };
  const finish = (result: DesignTokenImportDialogResult) => {
    resolve(result);
    close();
  };

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (open === false) {
          finish("cancel");
        }
      }}
    >
      <DialogContent css={{ minWidth: "40ch" }}>
        <DialogTitle>Import tokens</DialogTitle>
        <Flex direction="column" gap="2" css={{ padding: theme.panel.padding }}>
          <DialogDescription>
            Choose how these tokens should be represented in Webstudio.
          </DialogDescription>
          <DialogRadioOptions
            value={target}
            options={importTargetOptions}
            onValueChange={(target) => {
              if ($dialogState.get()?.resolve === resolve) {
                $dialogState.set({ target, resolve });
              }
            }}
          />
        </Flex>
        <DialogActions>
          <Button autoFocus color="positive" onClick={() => finish(target)}>
            Import
          </Button>
          <Button color="ghost" onClick={() => finish("cancel")}>
            Cancel
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};
