import { useState } from "react";
import { useRevalidator } from "@remix-run/react";
import {
  Button,
  Box,
  Flex,
  Label,
  Text,
  InputField,
  DialogActions,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
  theme,
} from "@webstudio-is/design-system";
import type { Workspace } from "@webstudio-is/project";
import { trpcClient } from "~/shared/trpc/trpc-client";

export const RenameWorkspaceDialog = ({
  workspace,
  isOpen,
  onOpenChange,
}: {
  workspace: Workspace;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { send, state } = trpcClient.workspace.rename.useMutation();
  const revalidator = useRevalidator();
  const [errors, setErrors] = useState<string>();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (open === false) {
          setErrors(undefined);
        }
      }}
    >
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const name = String(formData.get("name") ?? "").trim();

            if (name.length < 2) {
              setErrors("Workspace name must be at least 2 characters");
              return;
            }

            setErrors(undefined);
            send({ workspaceId: workspace.id, name }, (result) => {
              if (result && "error" in result) {
                setErrors(result.error);
                return;
              }
              onOpenChange(false);
              revalidator.revalidate();
            });
          }}
        >
          <Flex
            direction="column"
            css={{
              px: theme.spacing[7],
              paddingTop: theme.spacing[5],
            }}
            gap="1"
          >
            <Label>Workspace name</Label>
            <InputField
              name="name"
              defaultValue={workspace.name}
              color={errors ? "error" : undefined}
            />
            <Box css={{ minHeight: theme.spacing[10] }}>
              {errors && <Text color="destructive">{errors}</Text>}
            </Box>
          </Flex>
          <DialogActions>
            <Button
              type="submit"
              state={state === "idle" ? undefined : "pending"}
            >
              Rename
            </Button>
            <DialogClose>
              <Button color="ghost">Cancel</Button>
            </DialogClose>
          </DialogActions>
        </form>
        <DialogTitle>Rename</DialogTitle>
      </DialogContent>
    </Dialog>
  );
};
