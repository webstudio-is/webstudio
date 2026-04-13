import { useCallback, useEffect, useState } from "react";
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
  IconButton,
  InputErrorsTooltip,
  ScrollAreaNative,
  Select,
  Tooltip,
  css,
  theme,
} from "@webstudio-is/design-system";
import { TrashIcon } from "@webstudio-is/icons";
import { type Workspace, type Role } from "@webstudio-is/project";
import { nativeClient, trpcClient } from "~/shared/trpc/trpc-client";
import { RoleSelect } from "./role-select";

const inviteMembers = async (
  emails: string[],
  workspaceId: string,
  relation: Role
): Promise<string[]> => {
  const failed: string[] = [];
  for (const email of emails) {
    try {
      const result = await nativeClient.workspace.addMember.mutate({
        workspaceId,
        email,
        relation,
      });
      if (!result.success) {
        failed.push(`${email}: ${result.error}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      failed.push(`${email}: ${message}`);
    }
  }
  return failed;
};

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

    if (role === "pending") {
      return (
        <Text color="subtle" variant="regular">
          Pending…
        </Text>
      );
    }

    return (
      <RoleSelect
        color="ghost"
        value={localRole}
        onChange={(newRole: Role) => {
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
        }}
        disabled={!props.canRemove}
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

type OptimisticPendingInvite = {
  notificationId: string;
  email: string;
  relation: Role;
};

const MemberList = ({
  workspaceId,
  canRemove,
  refreshKey,
  onRefresh,
  onSeatsLoaded,
  optimisticPending,
  onRemoveOptimistic,
}: {
  workspaceId: string;
  canRemove: boolean;
  refreshKey: number;
  onRefresh: () => void;
  onSeatsLoaded?: (seatsUsed: number, maxSeats: number) => void;
  optimisticPending: OptimisticPendingInvite[];
  onRemoveOptimistic: (notificationId: string) => void;
}) => {
  const { load, data } = trpcClient.workspace.listMembers.useQuery();

  useEffect(() => {
    load({ workspaceId });
  }, [load, workspaceId, refreshKey]);

  const result = data && "data" in data ? data.data : undefined;

  useEffect(() => {
    if (result !== undefined && onSeatsLoaded !== undefined) {
      onSeatsLoaded(
        result.members.length + result.pendingInvites.length,
        result.maxSeats
      );
    }
  }, [result, onSeatsLoaded]);

  if (result === undefined) {
    return (
      <Text color="subtle" align="center">
        Loading members…
      </Text>
    );
  }

  const { owner, members, pendingInvites } = result;

  // Emails already covered by confirmed pending invites or accepted members
  const knownEmails = new Set([
    owner.email,
    ...members.map((m) => m.email ?? ""),
    ...pendingInvites.map((i) => i.email),
  ]);
  const extraOptimistic = optimisticPending.filter(
    (o) => !knownEmails.has(o.email)
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
        {pendingInvites.map((invite) => (
          <MemberRow
            key={invite.notificationId}
            email={invite.email}
            role="pending"
            relation={invite.relation as Role}
            canRemove={canRemove}
            index={index++}
            onRemove={() => {
              nativeClient.notification.cancel
                .mutate({ notificationId: invite.notificationId })
                .then(() => onRefresh())
                .catch(() => {});
            }}
          />
        ))}
        {extraOptimistic.map((invite) => (
          <MemberRow
            key={invite.notificationId}
            email={invite.email}
            role="pending"
            relation={invite.relation}
            canRemove={canRemove}
            index={index++}
            onRemove={() => onRemoveOptimistic(invite.notificationId)}
          />
        ))}
      </Box>
    </List>
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
  const [availableSeats, setAvailableSeats] = useState<number>();
  const [optimisticPending, setOptimisticPending] = useState<
    OptimisticPendingInvite[]
  >([]);
  const handleSeatsLoaded = useCallback(
    (used: number, max: number) => setAvailableSeats(Math.max(0, max - used)),
    []
  );

  useEffect(() => {
    if (isOpen && isOwner) {
      setMembersKey((key) => key + 1);
    }
  }, [isOpen, isOwner]);

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
    // Add optimistic entries immediately so the UI shows them while the list refreshes
    const optimistic: OptimisticPendingInvite[] = emails.map((email) => ({
      notificationId: crypto.randomUUID(),
      email,
      relation: inviteRelation,
    }));
    setOptimisticPending((prev) => [...prev, ...optimistic]);

    const failed = await inviteMembers(emails, workspace.id, inviteRelation);
    setInviting(false);

    if (failed.length > 0) {
      setErrors(failed);
      // Remove optimistic entries for emails that failed
      const failedEmails = new Set(failed.map((f) => f.split(":")[0].trim()));
      setOptimisticPending((prev) =>
        prev.filter((o) => !failedEmails.has(o.email))
      );
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
                <RoleSelect
                  value={inviteRelation}
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
                onRefresh={() => setMembersKey((key) => key + 1)}
                optimisticPending={optimisticPending}
                onRemoveOptimistic={(id) =>
                  setOptimisticPending((prev) =>
                    prev.filter((o) => o.notificationId !== id)
                  )
                }
                onSeatsLoaded={handleSeatsLoaded}
              />
            </Flex>
          </ScrollAreaNative>
        </Flex>
        <DialogActions>
          <Flex justify="between" align="center" grow>
            {availableSeats !== undefined && (
              <Text color={availableSeats === 0 ? "destructive" : "subtle"}>
                {availableSeats} more seats included
              </Text>
            )}
            <DialogClose>
              <Button color="ghost">Cancel</Button>
            </DialogClose>
          </Flex>
        </DialogActions>
        <DialogTitle>Members</DialogTitle>
      </DialogContent>
    </Dialog>
  );
};
