import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  Flex,
  MenuCheckedIcon,
  Avatar,
  theme,
  Button,
  Text,
  ProBadge,
} from "@webstudio-is/design-system";
import { ChevronDownIcon, UpgradeIcon } from "@webstudio-is/icons";
import type { WorkspaceWithRelation } from "@webstudio-is/project";
import { useNavigate, useLocation } from "@remix-run/react";
import { useStore } from "@nanostores/react";
import { $permissions } from "~/shared/nano-states";
import {
  CreateWorkspaceDialog,
  RenameWorkspaceDialog,
  ManageMembersDialog,
  DeleteWorkspaceDialog,
  LeaveWorkspaceDialog,
} from "./workspace-dialogs";

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
    if (workspace.workspaceRelation === "own") {
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

  return (
    <Flex
      grow
      css={{
        paddingBlock: theme.spacing[5],
        minWidth: 0,
      }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            color="ghost"
            prefix={
              <Avatar
                size="small"
                fallback={(currentWorkspace?.name ?? "W")
                  .charAt(0)
                  .toLocaleUpperCase()}
                alt={currentWorkspace?.name ?? "Workspace"}
                css={{ borderRadius: theme.borderRadius[4] }}
              />
            }
            suffix={<ChevronDownIcon />}
          >
            {currentWorkspace?.name ?? "Workspace"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={currentWorkspaceId}
            onValueChange={(workspaceId) => {
              const defaultWorkspace = workspaces.find((w) => w.isDefault);

              if (workspaceId === defaultWorkspace?.id) {
                navigate(location.pathname);
                return;
              }

              navigate(`${location.pathname}?workspaceId=${workspaceId}`);
            }}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>My workspaces</DropdownMenuLabel>
              {owned.map((workspace) => (
                <DropdownMenuRadioItem
                  key={workspace.id}
                  value={workspace.id}
                  icon={<MenuCheckedIcon />}
                  disabled={workspace.isDowngraded}
                >
                  {workspace.name}
                  {workspace.isDowngraded && (
                    <>
                      {" "}
                      <ProBadge>Suspended</ProBadge>
                    </>
                  )}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuGroup>
            {shared.length > 0 && (
              <DropdownMenuGroup>
                <DropdownMenuLabel>Shared with me</DropdownMenuLabel>
                {shared.map((workspace) => (
                  <DropdownMenuRadioItem
                    key={workspace.id}
                    value={workspace.id}
                    icon={<MenuCheckedIcon />}
                    disabled={workspace.isDowngraded}
                  >
                    {workspace.name}
                    {workspace.isDowngraded && (
                      <>
                        {" "}
                        <ProBadge>Suspended</ProBadge>
                      </>
                    )}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuGroup>
            )}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          {permissions.canCreateWorkspace && (
            <DropdownMenuItem
              withIndicator
              onSelect={() => setCreateOpen(true)}
            >
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
        </DropdownMenuContent>
      </DropdownMenu>
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
