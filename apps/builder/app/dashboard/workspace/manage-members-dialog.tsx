import { useCallback, useEffect, useRef, useState } from "react";
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
  PanelBanner,
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
      const raw = error instanceof Error ? error.message : "Unknown error";
      // tRPC surfaces Zod input validation failures as a JSON array of issues.
      // Extract the human-readable message(s) instead of dumping raw JSON.
      let message = raw;
      try {
        const issues = JSON.parse(raw);
        if (Array.isArray(issues) && issues.length > 0) {
          message = issues
            .map((i: { message?: string }) => i.message ?? "Invalid value")
            .join(", ");
        }
      } catch {
        // not JSON — use raw message as-is
      }
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

const computeAvailableSeats = (
  membersData:
    | Extract<
        Exclude<
          ReturnType<typeof trpcClient.workspace.listMembers.useQuery>["data"],
          undefined
        >,
        { success: true }
      >["data"]
    | undefined,
  optimisticPending: OptimisticPendingInvite[],
  maxSeatsBoost = 0
): number | undefined => {
  if (membersData === undefined) {
    return;
  }
  const knownEmails = new Set([
    membersData.owner.email,
    ...membersData.members.map((m) => m.email ?? ""),
    ...membersData.pendingInvites.map((i) => i.email),
  ]);
  const extraCount = optimisticPending.filter(
    (o) => !knownEmails.has(o.email)
  ).length;
  return (
    membersData.maxSeats +
    maxSeatsBoost -
    membersData.members.length -
    membersData.pendingInvites.length -
    extraCount
  );
};

const MemberList = ({
  workspaceId,
  canRemove,
  membersData,
  onRefresh,
  optimisticPending,
  onRemoveOptimistic,
}: {
  workspaceId: string;
  canRemove: boolean;
  membersData:
    | Extract<
        Exclude<
          ReturnType<typeof trpcClient.workspace.listMembers.useQuery>["data"],
          undefined
        >,
        { success: true }
      >["data"]
    | undefined;
  onRefresh: () => void;
  optimisticPending: OptimisticPendingInvite[];
  onRemoveOptimistic: (notificationId: string) => void;
}) => {
  if (membersData === undefined) {
    return (
      <Text color="subtle" align="center">
        Loading members…
      </Text>
    );
  }

  const { owner, members, pendingInvites } = membersData;

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

const ExtraSeatsConfirmDialog = ({
  memberCount,
  extraSeats,
  onConfirm,
  onCancel,
}: {
  memberCount: number;
  extraSeats: number;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <Dialog open onOpenChange={(open) => !open && onCancel()}>
    <DialogContent>
      <DialogTitle>Extra seats will be charged</DialogTitle>
      <Flex direction="column" gap="2" css={{ padding: theme.spacing[5] }}>
        <Text>
          {`Inviting ${memberCount} member${
            memberCount === 1 ? "" : "s"
          } will add ${extraSeats} extra seat${
            extraSeats === 1 ? "" : "s"
          } to your billing.`}
        </Text>
      </Flex>
      <DialogActions>
        <Button autoFocus onClick={onConfirm}>
          Confirm
        </Button>
        <Button color="neutral" onClick={onCancel}>
          Cancel
        </Button>
      </DialogActions>
    </DialogContent>
  </Dialog>
);

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
  const [inviting, setInviting] = useState(false);
  const [inviteRelation, setInviteRelation] = useState<Role>("viewers");
  const [optimisticPending, setOptimisticPending] = useState<
    OptimisticPendingInvite[]
  >([]);
  const [pendingConfirm, setPendingConfirm] = useState<{
    emails: string[];
    relation: Role;
    extraSeats: number;
  }>();
  const [maxSeatsBoost, setMaxSeatsBoost] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const { load, data } = trpcClient.workspace.listMembers.useQuery();
  const membersData = data?.success ? data.data : undefined;
  const handleRefresh = useCallback(() => {
    load({ workspaceId: workspace.id });
  }, [load, workspace.id]);

  useEffect(() => {
    if (isOpen && isOwner) {
      load({ workspaceId: workspace.id });
    }
  }, [isOpen, isOwner, load, workspace.id]);

  const availableSeats = computeAvailableSeats(
    membersData,
    optimisticPending,
    maxSeatsBoost
  );

  const syncSeatsMutation = trpcClient.workspace.syncSeats.useMutation();

  const overCapacity =
    availableSeats !== undefined && availableSeats < 0 ? -availableSeats : 0;

  const handleSyncSeats = () => {
    syncSeatsMutation.send({ workspaceId: workspace.id }, (result) => {
      if (result && "error" in result) {
        setErrors([result.error]);
        return;
      }
      handleRefresh();
      revalidator.revalidate();
    });
  };

  const performInvite = async (
    emails: string[],
    relation: Role,
    { boughtExtraSeats = false } = {}
  ) => {
    setErrors(undefined);
    setInviting(true);

    const failed = await inviteMembers(emails, workspace.id, relation);
    setInviting(false);

    // Add optimistic entries only for emails that actually succeeded so that
    // non-existent or already-member emails never flicker into the list.
    const failedEmails = new Set(failed.map((f) => f.split(":")[0].trim()));
    const succeeded = emails.filter((e) => !failedEmails.has(e));

    // Optimistically bump maxSeats so the banner never flashes.
    // The server's maxSeats will catch up once the Stripe webhook lands,
    // but we cannot predict when that will happen.
    if (boughtExtraSeats && succeeded.length > 0) {
      setMaxSeatsBoost((prev) => prev + succeeded.length);
    }
    if (succeeded.length > 0) {
      const optimistic: OptimisticPendingInvite[] = succeeded.map((email) => ({
        notificationId: crypto.randomUUID(),
        email,
        relation,
      }));
      setOptimisticPending((prev) => [...prev, ...optimistic]);
    }

    if (failed.length > 0) {
      setErrors(failed);
    } else {
      formRef.current?.reset();
    }

    handleRefresh();
    revalidator.revalidate();
  };

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

    if (availableSeats !== undefined && emails.length > availableSeats) {
      setPendingConfirm({
        emails,
        relation: inviteRelation,
        extraSeats: emails.length - Math.max(0, availableSeats),
      });
      return;
    }

    await performInvite(emails, inviteRelation);
  };

  return (
    <>
      {pendingConfirm !== undefined && (
        <ExtraSeatsConfirmDialog
          memberCount={pendingConfirm.emails.length}
          extraSeats={pendingConfirm.extraSeats}
          onCancel={() => setPendingConfirm(undefined)}
          onConfirm={async () => {
            const confirm = pendingConfirm;
            setPendingConfirm(undefined);
            await performInvite(confirm.emails, confirm.relation, {
              boughtExtraSeats: true,
            });
          }}
        />
      )}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          onOpenChange(open);
          if (open === false) {
            setErrors(undefined);
            setMaxSeatsBoost(0);
          }
        }}
      >
        <DialogContent css={{ width: theme.spacing[34] }}>
          <Flex
            as="form"
            ref={formRef}
            direction="column"
            gap="3"
            onSubmit={handleSubmit}
          >
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
                  <Button
                    type="submit"
                    state={inviting ? "pending" : undefined}
                  >
                    Invite
                  </Button>
                </Flex>
              </Flex>
            )}
            {isOwner && overCapacity > 0 && (
              <PanelBanner variant="warning">
                <Flex direction="column" gap="2">
                  <Text>
                    {`Your workspace has ${overCapacity} more member${overCapacity === 1 ? "" : "s"} than your plan covers. Non-owner members won't be able to access the workspace until this is resolved.`}
                  </Text>
                  <Flex gap="2">
                    <Button
                      color="dark"
                      onClick={handleSyncSeats}
                      state={
                        syncSeatsMutation.state !== "idle"
                          ? "pending"
                          : undefined
                      }
                    >
                      {`Buy ${overCapacity} extra seat${overCapacity === 1 ? "" : "s"}`}
                    </Button>
                    <Text color="subtle" css={{ alignSelf: "center" }}>
                      {`or remove ${overCapacity} member${overCapacity === 1 ? "" : "s"}`}
                    </Text>
                  </Flex>
                </Flex>
              </PanelBanner>
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
                  membersData={membersData}
                  onRefresh={handleRefresh}
                  optimisticPending={optimisticPending}
                  onRemoveOptimistic={(id) =>
                    setOptimisticPending((prev) =>
                      prev.filter((o) => o.notificationId !== id)
                    )
                  }
                />
              </Flex>
            </ScrollAreaNative>
          </Flex>
          <DialogActions>
            <Flex justify="between" align="center" grow>
              {availableSeats !== undefined ? (
                <Text color={availableSeats <= 0 ? "destructive" : "subtle"}>
                  {availableSeats >= 0
                    ? `${availableSeats} more seats included`
                    : `${-availableSeats} extra seat${-availableSeats === 1 ? "" : "s"} will be charged`}
                </Text>
              ) : (
                <div />
              )}
              <DialogClose>
                <Button color="ghost">Cancel</Button>
              </DialogClose>
            </Flex>
          </DialogActions>
          <DialogTitle>Members</DialogTitle>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const __testing__ = { computeAvailableSeats };
