import { useState } from "react";
import { useRevalidator } from "@remix-run/react";
import {
  Button,
  Flex,
  Text,
  DialogActions,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
  DialogDescription,
  theme,
} from "@webstudio-is/design-system";
import type { Workspace } from "@webstudio-is/project";
import { trpcClient } from "~/shared/trpc/trpc-client";

export const LeaveWorkspaceDialog = ({
  workspace,
  userId,
  isOpen,
  onOpenChange,
  onLeft,
}: {
  workspace: Workspace;
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onLeft: () => void;
}) => {
  const { send, state } = trpcClient.workspace.removeMember.useMutation();
  const revalidator = useRevalidator();
  const [error, setError] = useState<string>();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (open === false) {
          setError(undefined);
        }
      }}
    >
      <DialogContent>
        <Flex
          direction="column"
          gap="2"
          css={{
            paddingInline: theme.spacing[9],
            paddingTop: theme.spacing[5],
          }}
        >
          <DialogDescription asChild>
            <Text as="p">
              Are you sure you want to leave{" "}
              <Text as="span" variant="titles">
                {workspace.name}
              </Text>
              ? You will lose access to all projects in this workspace.
            </Text>
          </DialogDescription>
          {error && <Text color="destructive">{error}</Text>}
        </Flex>
        <DialogActions>
          <Button
            color="destructive"
            state={state === "idle" ? undefined : "pending"}
            onClick={() => {
              send(
                { workspaceId: workspace.id, memberUserId: userId },
                (result) => {
                  if (result && "error" in result) {
                    setError(result.error);
                    return;
                  }
                  onOpenChange(false);
                  onLeft();
                  revalidator.revalidate();
                }
              );
            }}
          >
            Leave
          </Button>
          <DialogClose>
            <Button color="ghost">Cancel</Button>
          </DialogClose>
        </DialogActions>
        <DialogTitle>Leave workspace</DialogTitle>
      </DialogContent>
    </Dialog>
  );
};
