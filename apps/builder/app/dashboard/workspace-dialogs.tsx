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
  Select,
  Tooltip,
  css,
  theme,
} from "@webstudio-is/design-system";
import { TrashIcon } from "@webstudio-is/icons";
import {
  type Workspace,
  type Role,
  roles,
  roleLabels,
} from "@webstudio-is/project";
import { nativeClient, trpcClient } from "~/shared/trpc/trpc-client";

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

type MemberRowProps = {
  email: string;
  index: number;
} & (
  | { role: "owner" }
  | {
      role: "member";
      userId: string;
      workspaceId: string;
      relation: Role;
      canRemove: boolean;
      onRefresh: () => void;
    }
  | {
      role: "pending";
      relation: Role;
      canRemove: boolean;
      onRemove: () => void;
      onChangeRole: (role: Role) => void;
    }
);

const MemberRow = (props: MemberRowProps) => {
  const { email, index, role } = props;
  const removeMutation = trpcClient.workspace.removeMember.useMutation();
  const updateMutation = trpcClient.workspace.updateRole.useMutation();
  const revalidator = useRevalidator();
  const [error, setError] = useState<string>();
  const [localRole, setLocalRole] = useState<Role>(
    role !== "owner" ? props.relation : "administrators"
  );

  const selectElement = (() => {
    if (role === "owner") {
      return (
        <Select color="ghost" options={["Owner"]} value="Owner" disabled />
      );
    }

    const value = role === "pending" ? props.relation : localRole;

    const handleChange =
      role === "pending"
        ? props.onChangeRole
        : (newRole: Role) => {
            setError(undefined);
            setLocalRole(newRole);
            updateMutation.send(
              {
                workspaceId: props.workspaceId,
                memberUserId: props.userId,
                relation: newRole,
              },
              (result) => {
                if (result && "error" in result) {
                  setError(result.error);
                  setLocalRole(props.relation);
                  return;
                }
                props.onRefresh();
                revalidator.revalidate();
              }
            );
          };

    return (
      <Select
        color="ghost"
        options={[...roles]}
        value={value}
        getLabel={(option: Role) => roleLabels[option]}
        onChange={handleChange}
        disabled={!props.canRemove || role === "pending"}
      />
    );
  })();

  const deleteElement = (() => {
    if (role === "owner") {
      return (
        <IconButton aria-label="Remove member" tabIndex={-1} disabled>
          <TrashIcon />
        </IconButton>
      );
    }

    if (props.canRemove) {
      return (
        <Tooltip
          content={error ?? "Remove member"}
          variant={error ? "wrapped" : undefined}
          open={error ? true : undefined}
        >
          <IconButton
            data-action
            tabIndex={-1}
            aria-label="Remove member"
            onClick={() => {
              if (role === "pending") {
                props.onRemove();
                return;
              }
              setError(undefined);
              removeMutation.send(
                {
                  workspaceId: props.workspaceId,
                  memberUserId: props.userId,
                },
                (result) => {
                  if (result && "error" in result) {
                    setError(result.error);
                    return;
                  }
                  props.onRefresh();
                  revalidator.revalidate();
                }
              );
            }}
            disabled={
              role === "member" ? removeMutation.state !== "idle" : false
            }
          >
            <TrashIcon />
          </IconButton>
        </Tooltip>
      );
    }

    return (
      <IconButton
        aria-label="Remove member"
        tabIndex={-1}
        disabled
        css={{ visibility: "hidden" }}
      >
        <TrashIcon />
      </IconButton>
    );
  })();

  return (
    <ListItem index={index} asChild>
      <Flex
        align="center"
        gap="2"
        justify="between"
        className={memberItemStyle()}
      >
        <Flex direction="column" css={{ minWidth: 0, flexGrow: 1 }}>
          <Text truncate>{email}</Text>
        </Flex>
        <Flex align="center" gap="1" css={{ flexShrink: 0 }}>
          {selectElement}
          {deleteElement}
        </Flex>
      </Flex>
    </ListItem>
  );
};

const MemberList = ({
  workspaceId,
  canRemove,
  refreshKey,
  invitedEmails,
  onRefresh,
  onRemoveInvited,
  onChangeInvitedRole,
}: {
  workspaceId: string;
  canRemove: boolean;
  refreshKey: number;
  invitedEmails: Map<string, { relation: Role; notificationId: string }>;
  onRefresh: () => void;
  onRemoveInvited: (email: string) => void;
  onChangeInvitedRole: (email: string, relation: Role) => void;
}) => {
  const { load, data } = trpcClient.workspace.listMembers.useQuery();

  useEffect(() => {
    load({ workspaceId });
  }, [load, workspaceId, refreshKey]);

  const result = data && "data" in data ? data.data : undefined;

  if (result === undefined) {
    return (
      <Text color="subtle" align="center">
        Loading members…
      </Text>
    );
  }

  const { owner, members } = result;

  // Show invited emails that aren't already in the real member list.
  // This makes behavior identical for existing vs non-existing emails,
  // preventing email enumeration.
  const knownEmails = new Set(members.map((m) => m.email));
  const pendingEntries = [...invitedEmails].filter(
    ([email]) => knownEmails.has(email) === false
  );

  let index = 0;

  return (
    <List asChild>
      <Box>
        <MemberRow email={owner.email} role="owner" index={index++} />
        {members.map((member) => (
          <MemberRow
            key={member.userId}
            email={member.email ?? ""}
            role="member"
            userId={member.userId}
            workspaceId={workspaceId}
            relation={member.relation as Role}
            canRemove={canRemove}
            index={index++}
            onRefresh={onRefresh}
          />
        ))}
        {pendingEntries.map(([email, { relation }]) => (
          <MemberRow
            key={email}
            email={email}
            role="pending"
            relation={relation}
            canRemove={canRemove}
            index={index++}
            onRemove={() => onRemoveInvited(email)}
            onChangeRole={(newRole) => onChangeInvitedRole(email, newRole)}
          />
        ))}
      </Box>
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
  userId,
  isOpen,
  onOpenChange,
}: {
  workspace: Workspace;
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const isOwner = workspace.userId === userId;
  const revalidator = useRevalidator();
  const [errors, setErrors] = useState<string[]>();
  const [membersKey, setMembersKey] = useState(0);
  const [inviting, setInviting] = useState(false);
  const [inviteRelation, setInviteRelation] = useState<Role>("viewers");
  const [invitedEmails, setInvitedEmails] = useState<
    Map<string, { relation: Role; notificationId: string }>
  >(new Map());
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
    const succeeded: { email: string; notificationId: string }[] = [];
    for (const email of emails) {
      try {
        const result = await nativeClient.workspace.addMember.mutate({
          workspaceId: workspace.id,
          email,
          relation: inviteRelation,
        });
        if (result.success) {
          succeeded.push({ email, notificationId: result.notificationId });
        } else {
          failed.push(`${email}: ${result.error}`);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        failed.push(`${email}: ${message}`);
      }
    }

    setInviting(false);

    if (succeeded.length > 0) {
      setInvitedEmails((prev) => {
        const next = new Map(prev);
        for (const { email, notificationId } of succeeded) {
          next.set(email, { relation: inviteRelation, notificationId });
        }
        return next;
      });
    }

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
          {isOwner && (
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
                <Select
                  options={[...roles]}
                  value={inviteRelation}
                  getLabel={(option: Role) => roleLabels[option]}
                  onChange={setInviteRelation}
                />
                <Button type="submit" state={inviting ? "pending" : undefined}>
                  Invite
                </Button>
              </Flex>
            </Flex>
          )}
          <ScrollAreaNative
            css={{
              maxHeight: 300,
              paddingTop: isOwner ? undefined : theme.spacing[5],
            }}
          >
            <Flex direction="column" gap="2" css={{ px: theme.spacing[7] }}>
              <Text variant="labels">Members</Text>
              <MemberList
                workspaceId={workspace.id}
                canRemove={isOwner}
                refreshKey={membersKey}
                invitedEmails={invitedEmails}
                onRefresh={() => setMembersKey((key) => key + 1)}
                onRemoveInvited={(email) => {
                  const entry = invitedEmails.get(email);
                  if (entry) {
                    // Fire-and-forget: cancel the server-side notification.
                    // For fake IDs (non-existent users) this fails silently,
                    // preserving anti-enumeration.
                    nativeClient.notification.cancel
                      .mutate({ notificationId: entry.notificationId })
                      .catch(() => {});
                  }
                  setInvitedEmails((prev) => {
                    const next = new Map(prev);
                    next.delete(email);
                    return next;
                  });
                }}
                onChangeInvitedRole={(email, relation) => {
                  setInvitedEmails((prev) => {
                    const existing = prev.get(email);
                    if (existing === undefined) {
                      return prev;
                    }
                    const next = new Map(prev);
                    next.set(email, { ...existing, relation });
                    return next;
                  });
                }}
              />
            </Flex>
          </ScrollAreaNative>
        </Flex>
        <DialogActions>
          <DialogClose>
            <Button color="ghost">Cancel</Button>
          </DialogClose>
        </DialogActions>
        <DialogTitle>Members</DialogTitle>
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
              Are you sure you want to delete{" "}
              <Text as="span" variant="titles">
                {workspace.name}
              </Text>
              ?{" "}
              <Text as="span" color="destructive">
                All projects
              </Text>{" "}
              in this workspace will be deleted. This action cannot be undone.
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
                { workspaceId: workspace.id, deleteProjects: true },
                (result) => {
                  if (result && "error" in result) {
                    setError(result.error);
                    return;
                  }
                  onOpenChange(false);
                  onDeleted();
                  revalidator.revalidate();
                }
              );
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

// ---------------------------------------------------------------------------
// Leave workspace (non-owner members)
// ---------------------------------------------------------------------------

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
