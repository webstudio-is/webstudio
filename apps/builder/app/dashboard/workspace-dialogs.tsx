import { useEffect, useState } from "react";
import { useRevalidator } from "@remix-run/react";
import {
  Button,
  Box,
  Flex,
  Label,
  List,
  ListItem,
  Text,
  InputField,
  DialogActions,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
  DialogDescription,
  IconButton,
  InputErrorsTooltip,
  ScrollAreaNative,
  Tooltip,
  css,
  theme,
} from "@webstudio-is/design-system";
import { TrashIcon } from "@webstudio-is/icons";
import type { Workspace } from "@webstudio-is/project";
import { nativeClient, trpcClient } from "~/shared/trpc/trpc-client";

/**
 * tRPC zod validation errors arrive as a JSON array string like:
 * `[{"code":"invalid_string","message":"Invalid email","path":["email"]}]`
 * Extract the first human-readable `message` from that JSON, or return as-is.
 */
const parseTrpcError = (raw: string | undefined): string | undefined => {
  if (raw === undefined) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].message) {
      return parsed[0].message;
    }
  } catch {
    // not JSON — return as-is
  }
  return raw;
};

// ---------------------------------------------------------------------------
// Create workspace
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Workspace settings (rename, members, delete)
// ---------------------------------------------------------------------------

const memberItemStyle = css({
  paddingInline: theme.spacing[5],
  paddingBlock: theme.spacing[3],
  borderRadius: theme.borderRadius[4],
  outline: "none",
  "&:hover, &:focus-within": {
    backgroundColor: theme.colors.backgroundHover,
  },
  "& [data-action]": {
    visibility: "hidden",
  },
  "&:hover [data-action], &:focus-within [data-action]": {
    visibility: "visible",
  },
});

const MemberRow = ({
  email,
  username,
  userId,
  workspaceId,
  index,
  onRemoved,
}: {
  email: string;
  username: string;
  userId: string;
  workspaceId: string;
  index: number;
  onRemoved: () => void;
}) => {
  const { send, state } = trpcClient.workspace.removeMember.useMutation();
  const revalidator = useRevalidator();

  return (
    <ListItem index={index} asChild>
      <Flex
        align="center"
        gap="2"
        justify="between"
        className={memberItemStyle()}
      >
        <Flex direction="column" css={{ minWidth: 0 }}>
          <Text truncate>{username || email}</Text>
          {username && (
            <Text color="subtle" variant="small" truncate>
              {email}
            </Text>
          )}
        </Flex>
        <Tooltip content="Remove member">
          <IconButton
            data-action
            tabIndex={-1}
            aria-label="Remove member"
            onClick={() => {
              send({ workspaceId, userId }, () => {
                onRemoved();
                revalidator.revalidate();
              });
            }}
            disabled={state !== "idle"}
          >
            <TrashIcon />
          </IconButton>
        </Tooltip>
      </Flex>
    </ListItem>
  );
};

const MemberList = ({
  workspaceId,
  refreshKey,
  onRefresh,
}: {
  workspaceId: string;
  refreshKey: number;
  onRefresh: () => void;
}) => {
  const { load, data } = trpcClient.workspace.listMembers.useQuery();

  useEffect(() => {
    load({ workspaceId });
  }, [load, workspaceId, refreshKey]);

  const members = data && "data" in data ? data.data : undefined;

  if (members === undefined || members.length === 0) {
    return;
  }

  return (
    <List style={{ padding: 0, margin: 0 }}>
      {members.map((member, index) => (
        <MemberRow
          key={member.userId}
          email={member.email ?? ""}
          username={member.username ?? ""}
          userId={member.userId}
          workspaceId={workspaceId}
          index={index}
          onRemoved={onRefresh}
        />
      ))}
    </List>
  );
};

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

export const ManageMembersDialog = ({
  workspace,
  isOpen,
  onOpenChange,
}: {
  workspace: Workspace;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const revalidator = useRevalidator();
  const [errors, setErrors] = useState<string[]>();
  const [membersKey, setMembersKey] = useState(0);
  const [inviting, setInviting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const raw = String(formData.get("emails") ?? "").trim();

    const emails = raw
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    if (emails.length === 0) {
      return;
    }

    setErrors(undefined);
    setInviting(true);

    const failed: string[] = [];
    for (const email of emails) {
      try {
        await nativeClient.workspace.addMember.mutate({
          workspaceId: workspace.id,
          email,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? (parseTrpcError(error.message) ?? error.message)
            : "Unknown error";
        failed.push(`${email}: ${message}`);
      }
    }

    setInviting(false);

    if (failed.length > 0) {
      setErrors(failed);
    } else {
      (event.target as HTMLFormElement).reset();
    }

    setMembersKey((key) => key + 1);
    revalidator.revalidate();
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
      <DialogContent css={{ width: theme.spacing[34] }}>
        <Flex as="form" direction="column" gap="3" onSubmit={handleSubmit}>
          <Flex
            gap="1"
            direction="column"
            css={{
              px: theme.spacing[7],
              paddingTop: theme.spacing[5],
            }}
          >
            <Label>Invite members</Label>
            <Flex gap="2">
              <Box css={{ flexGrow: 1 }}>
                <InputErrorsTooltip errors={errors}>
                  <InputField
                    name="emails"
                    placeholder="alice@example.com, bob@example.com"
                    color={errors ? "error" : undefined}
                  />
                </InputErrorsTooltip>
              </Box>
              <Button type="submit" state={inviting ? "pending" : undefined}>
                Invite
              </Button>
            </Flex>
          </Flex>
          <ScrollAreaNative css={{ maxHeight: 300 }}>
            <Flex direction="column" gap="2" css={{ px: theme.spacing[7] }}>
              <Text variant="labels">Members</Text>
              <MemberList
                workspaceId={workspace.id}
                refreshKey={membersKey}
                onRefresh={() => setMembersKey((key) => key + 1)}
              />
            </Flex>
          </ScrollAreaNative>
        </Flex>
        <DialogActions>
          <DialogClose>
            <Button color="ghost">Cancel</Button>
          </DialogClose>
        </DialogActions>
        <DialogTitle>Manage members</DialogTitle>
      </DialogContent>
    </Dialog>
  );
};

export const DeleteWorkspaceDialog = ({
  workspace,
  isOpen,
  onOpenChange,
  onDeleted,
}: {
  workspace: Workspace;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) => {
  const { send, state } = trpcClient.workspace.delete.useMutation();
  const revalidator = useRevalidator();
  const [error, setError] = useState<string>();

  if (workspace.isDefault) {
    return;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
              Are you sure you want to delete{" "}
              <Text as="span" variant="titles">
                {workspace.name}
              </Text>
              ? This action cannot be undone.
            </Text>
          </DialogDescription>
          {error && <Text color="destructive">{error}</Text>}
        </Flex>
        <DialogActions>
          <Button
            color="destructive"
            state={state === "idle" ? undefined : "pending"}
            onClick={() => {
              send({ workspaceId: workspace.id }, (result) => {
                if (result && "error" in result) {
                  setError(result.error);
                  return;
                }
                onOpenChange(false);
                onDeleted();
                revalidator.revalidate();
              });
            }}
          >
            Delete forever
          </Button>
          <DialogClose>
            <Button color="ghost">Cancel</Button>
          </DialogClose>
        </DialogActions>
        <DialogTitle>Delete workspace</DialogTitle>
      </DialogContent>
    </Dialog>
  );
};
