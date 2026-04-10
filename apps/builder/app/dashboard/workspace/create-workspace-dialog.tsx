import { useState } from "react";
import { useRevalidator } from "@remix-run/react";
import {
  Button,
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
import { trpcClient } from "~/shared/trpc/trpc-client";

export const CreateWorkspaceDialog = ({
  isOpen,
  onOpenChange,
  onCreated,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (workspaceId: string) => void;
}) => {
  const { send, state } = trpcClient.workspace.create.useMutation();
  const revalidator = useRevalidator();
  const [errors, setErrors] = useState<string>();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();

    if (name.length < 2) {
      setErrors("Workspace name must be at least 2 characters");
      return;
    }

    setErrors(undefined);
    send({ name }, (result) => {
      if (result && "error" in result) {
        setErrors(result.error);
        return;
      }
      onOpenChange(false);
      revalidator.revalidate();
      if (result && "data" in result) {
        onCreated?.(result.data.id);
      }
    });
  };

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
        <form onSubmit={handleSubmit}>
          <Flex
            direction="column"
            gap="1"
            css={{
              paddingInline: theme.spacing[7],
              paddingTop: theme.spacing[5],
            }}
          >
            <Label htmlFor="workspace-name">Workspace name</Label>
            <InputField
              id="workspace-name"
              name="name"
              placeholder="My workspace"
              autoFocus
              color={errors ? "error" : undefined}
            />
            {errors && <Text color="destructive">{errors}</Text>}
          </Flex>
          <DialogActions>
            <Button
              type="submit"
              state={state === "idle" ? undefined : "pending"}
            >
              Create
            </Button>
            <DialogClose>
              <Button color="ghost">Cancel</Button>
            </DialogClose>
          </DialogActions>
        </form>
        <DialogTitle>New workspace</DialogTitle>
      </DialogContent>
    </Dialog>
  );
};
