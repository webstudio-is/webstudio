import { Select, Flex, theme } from "@webstudio-is/design-system";
import type { Workspace } from "@webstudio-is/project";
import { useNavigate, useLocation } from "@remix-run/react";

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
}: {
  workspaces: Array<Workspace>;
  currentWorkspaceId: string;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const sorted = sortWorkspaces(workspaces);

  return (
    <Flex
      css={{
        paddingInline: theme.panel.paddingInline,
        paddingBlock: theme.spacing[5],
      }}
    >
      <Select
        color="ghost"
        fullWidth
        options={sorted}
        getValue={(workspace) => workspace.id}
        getLabel={(workspace) => workspace.name}
        value={sorted.find((w) => w.id === currentWorkspaceId)}
        onChange={(workspace) => {
          const defaultWorkspace = workspaces.find((w) => w.isDefault);

          // Default workspace doesn't need the query param
          if (workspace.id === defaultWorkspace?.id) {
            navigate(location.pathname);
            return;
          }

          navigate(`${location.pathname}?workspaceId=${workspace.id}`);
        }}
      />
    </Flex>
  );
};
