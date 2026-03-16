import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
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
import {
  CreateWorkspaceDialog,
  RenameWorkspaceDialog,
  ManageMembersDialog,
  DeleteWorkspaceDialog,
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

const canCreateWorkspace = (
  workspaces: Array<WorkspaceWithRelation>,
  userId: string,
  maxWorkspaces: number
) => {
  const ownedCount = workspaces.filter((w) => w.userId === userId).length;
  return ownedCount < maxWorkspaces;
};

export const __testing__ = { sortWorkspaces, canCreateWorkspace };

export const WorkspaceSelector = ({
  workspaces,
  currentWorkspaceId,
  userId,
  maxWorkspaces,
  onDeleted,
}: {
  workspaces: Array<WorkspaceWithRelation>;
  currentWorkspaceId: string;
  userId: string;
  maxWorkspaces: number;
  onDeleted: () => void;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const sorted = sortWorkspaces(workspaces);
  const currentWorkspace = sorted.find((w) => w.id === currentWorkspaceId);
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canCreateMore = canCreateWorkspace(workspaces, userId, maxWorkspaces);

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
            {sorted.map((workspace) => (
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
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          {canCreateMore && (
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
            disabled={maxWorkspaces <= 1}
            onSelect={() => setInviteOpen(true)}
          >
            Members
          </DropdownMenuItem>
          <DropdownMenuItem
            withIndicator
            disabled={
              currentWorkspace?.isDefault === true ||
              currentWorkspace?.userId !== userId
            }
            onSelect={() => setDeleteOpen(true)}
          >
            Delete
          </DropdownMenuItem>
          {canCreateMore === false && (
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
        </>
      )}
    </Flex>
  );
};
