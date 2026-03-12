import { Select, theme, Text, css } from "@webstudio-is/design-system";
import type { Workspace } from "@webstudio-is/project";
import { useNavigate, useLocation } from "@remix-run/react";

const selectStyle = css({
  paddingInline: theme.panel.paddingInline,
  paddingBlock: theme.spacing[5],
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

  // Sort: default workspace first, then alphabetically
  const sorted = [...workspaces].sort((a, b) => {
    if (a.isDefault) {
      return -1;
    }
    if (b.isDefault) {
      return 1;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className={selectStyle()}>
      <Text variant="titles" color="subtle" truncate>
        Workspace
      </Text>
      <Select
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
        fullWidth
      />
    </div>
  );
};
