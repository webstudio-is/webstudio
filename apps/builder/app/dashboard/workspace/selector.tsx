import { useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import {
  Avatar,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  MenuCheckedIcon,
  DropdownMenuSeparator,
  DropdownMenuItem,
  Flex,
  theme,
  Text,
  ProBadge,
} from "@webstudio-is/design-system";
import { ChevronDownIcon, UpgradeIcon } from "@webstudio-is/icons";
import type { WorkspaceWithRelation } from "@webstudio-is/project";
import { useNavigate, useLocation } from "@remix-run/react";
import { useStore } from "@nanostores/react";
import { $permissions } from "~/shared/nano-states";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";
import { RenameWorkspaceDialog } from "./rename-workspace-dialog";
import { ManageMembersDialog } from "./manage-members-dialog";
import { DeleteWorkspaceDialog } from "./delete-workspace-dialog";
import { LeaveWorkspaceDialog } from "./leave-workspace-dialog";

export type WorkspaceDropdownItem = {
  id: string;
  name: string;
  disabled?: boolean;
  suffix?: ReactNode;
};

export type WorkspaceDropdownGroup = {
  label: string;
  items: Array<WorkspaceDropdownItem>;
};

export const WorkspaceDropdown = ({
  groups,
  selectedId,
  onSelectedChange,
  color,
  children,
}: {
  groups: Array<WorkspaceDropdownGroup>;
  selectedId: string | undefined;
  onSelectedChange: (id: string) => void;
  color?: ComponentProps<typeof Button>["color"];
  children?: ReactNode;
}) => {
  const selectedItem = groups
    .flatMap((group) => group.items)
    .find((item) => item.id === selectedId);

  const triggerLabel = selectedItem?.name ?? "Select workspace";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          color={color}
          prefix={
            <Avatar
              size="small"
              fallback={triggerLabel.charAt(0).toLocaleUpperCase()}
              alt={triggerLabel}
              css={{ borderRadius: theme.borderRadius[4] }}
            />
          }
          suffix={<ChevronDownIcon />}
        >
          {triggerLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={selectedId ?? ""}
          onValueChange={onSelectedChange}
        >
          {groups.map((group) => (
            <DropdownMenuGroup key={group.label}>
              <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
              {group.items.map((item) => (
                <DropdownMenuRadioItem
                  key={item.id}
                  value={item.id}
                  icon={<MenuCheckedIcon />}
                  disabled={item.disabled}
                >
                  {item.name}
                  {item.suffix}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuGroup>
          ))}
        </DropdownMenuRadioGroup>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const sortWorkspaces = (workspaces: Array<WorkspaceWithRelation>) =>
  [...workspaces].sort((a, b) => {
    if (a.isDefault) {
      return -1;
    }
    if (b.isDefault) {
      return 1;
    }
    return a.name.localeCompare(b.name);
  });

const groupWorkspaces = (workspaces: Array<WorkspaceWithRelation>) => {
  const sorted = sortWorkspaces(workspaces);
  const owned: Array<WorkspaceWithRelation> = [];
  const shared: Array<WorkspaceWithRelation> = [];
  for (const workspace of sorted) {
    if (workspace.role === "own") {
      owned.push(workspace);
    } else {
      shared.push(workspace);
    }
  }
  return { owned, shared };
};

export const __testing__ = { sortWorkspaces, groupWorkspaces };

export const WorkspaceSelector = ({
  workspaces,
  currentWorkspaceId,
  userId,
  onDeleted,
}: {
  workspaces: Array<WorkspaceWithRelation>;
  currentWorkspaceId: string;
  userId: string;
  onDeleted: () => void;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const permissions = useStore($permissions);
  const { owned, shared } = groupWorkspaces(workspaces);
  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const isOwner = currentWorkspace?.userId === userId;

  const toDropdownItem = (workspace: WorkspaceWithRelation) => ({
    id: workspace.id,
    name: workspace.name,
    disabled: workspace.isDowngraded,
    suffix: workspace.isDowngraded ? (
      <>
        {" "}
        <ProBadge>Suspended</ProBadge>
      </>
    ) : undefined,
  });

  const groups: Array<WorkspaceDropdownGroup> = [
    { label: "My workspaces", items: owned.map(toDropdownItem) },
    ...(shared.length > 0
      ? [{ label: "Shared with me", items: shared.map(toDropdownItem) }]
      : []),
  ];

  const handleWorkspaceChange = (workspaceId: string) => {
    const defaultWorkspace = workspaces.find((w) => w.isDefault);

    if (workspaceId === defaultWorkspace?.id) {
      navigate(location.pathname);
      return;
    }

    navigate(`${location.pathname}?workspaceId=${workspaceId}`);
  };

  return (
    <Flex
      grow
      css={{
        paddingBlock: theme.spacing[5],
        minWidth: 0,
      }}
    >
      <WorkspaceDropdown
        groups={groups}
        selectedId={currentWorkspaceId}
        onSelectedChange={handleWorkspaceChange}
        color="ghost"
      >
        <DropdownMenuSeparator />
        {permissions.canCreateWorkspace && (
          <DropdownMenuItem withIndicator onSelect={() => setCreateOpen(true)}>
            Create new
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          withIndicator
          disabled={currentWorkspace?.userId !== userId}
          onSelect={() => setRenameOpen(true)}
        >
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem
          withIndicator
          disabled={permissions.canInviteMembers === false}
          onSelect={() => setInviteOpen(true)}
        >
          Members
        </DropdownMenuItem>
        {isOwner ? (
          <DropdownMenuItem
            withIndicator
            disabled={currentWorkspace?.isDefault === true}
            onSelect={() => setDeleteOpen(true)}
          >
            Delete
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem withIndicator onSelect={() => setLeaveOpen(true)}>
            Leave
          </DropdownMenuItem>
        )}
        {permissions.canCreateWorkspace === false && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                window.open("https://webstudio.is/pricing");
              }}
            >
              <Flex align="center" gap="1">
                <UpgradeIcon />
                <Text truncate>Upgrade</Text>
              </Flex>
            </DropdownMenuItem>
          </>
        )}
      </WorkspaceDropdown>
      <CreateWorkspaceDialog
        isOpen={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(workspaceId) => {
          navigate(`${location.pathname}?workspaceId=${workspaceId}`);
        }}
      />
      {currentWorkspace && (
        <>
          <RenameWorkspaceDialog
            workspace={currentWorkspace}
            isOpen={renameOpen}
            onOpenChange={setRenameOpen}
          />
          <ManageMembersDialog
            key={currentWorkspace.id}
            workspace={currentWorkspace}
            userId={userId}
            isOpen={inviteOpen}
            onOpenChange={setInviteOpen}
          />
          <DeleteWorkspaceDialog
            workspace={currentWorkspace}
            isOpen={deleteOpen}
            onOpenChange={setDeleteOpen}
            onDeleted={onDeleted}
          />
          <LeaveWorkspaceDialog
            workspace={currentWorkspace}
            userId={userId}
            isOpen={leaveOpen}
            onOpenChange={setLeaveOpen}
            onLeft={onDeleted}
          />
        </>
      )}
    </Flex>
  );
};
