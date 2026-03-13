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
  theme,
  Button,
} from "@webstudio-is/design-system";
import {
  ChevronDownIcon,
  EmailIcon,
  NotebookAndPenIcon,
  PlusIcon,
  TrashIcon,
} from "@webstudio-is/icons";
import type { Workspace } from "@webstudio-is/project";
import { useNavigate, useLocation } from "@remix-run/react";
import {
  CreateWorkspaceDialog,
  RenameWorkspaceDialog,
  ManageMembersDialog,
  DeleteWorkspaceDialog,
} from "./workspace-dialogs";

const sortWorkspaces = (workspaces: Array<Workspace>) =>
  [...workspaces].sort((a, b) => {
    if (a.isDefault) {
      return -1;
    }
    if (b.isDefault) {
      return 1;
    }
    return a.name.localeCompare(b.name);
  });

export const WorkspaceSelector = ({
  workspaces,
  currentWorkspaceId,
  onDeleted,
}: {
  workspaces: Array<Workspace>;
  currentWorkspaceId: string;
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
          <Button color="ghost" suffix={<ChevronDownIcon />}>
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
              >
                {workspace.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            icon={<PlusIcon />}
            onSelect={() => setCreateOpen(true)}
          >
            Create new
          </DropdownMenuItem>
          <DropdownMenuItem
            icon={<NotebookAndPenIcon />}
            onSelect={() => setRenameOpen(true)}
          >
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            icon={<EmailIcon />}
            onSelect={() => setInviteOpen(true)}
          >
            Manage members
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            icon={<TrashIcon />}
            disabled={currentWorkspace?.isDefault === true}
            onSelect={() => setDeleteOpen(true)}
          >
            Delete
          </DropdownMenuItem>
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
