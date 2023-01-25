import type { DashboardProjectRouter } from "@webstudio-is/dashboard";
import { Button, toast } from "@webstudio-is/design-system";
import { PlusIcon } from "@webstudio-is/icons";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardProjectPath, designerPath } from "~/shared/router-utils";
import { createTrpcRemixProxy } from "~/shared/remix/trpc-remix-proxy";

const trpc = createTrpcRemixProxy<DashboardProjectRouter>(dashboardProjectPath);
const useNewProject = () => {
  const { submit, data } = trpc.create.useMutation();
  const navigate = useNavigate();

  const handleCreate = () => {
    // @todo replace with the new dialog UI, waiting for dialog component
    const title = prompt("Project Title");
    // User has aborted
    if (title === null) {
      return;
    }

    submit({ title });
  };

  // @todo with dialog it can be displayed in the dialog
  useEffect(() => {
    if (data === undefined) {
      return;
    }
    if ("errors" in data) {
      toast.error(data.errors);
      return;
    }

    navigate(designerPath({ projectId: data.id }));
  }, [data, navigate]);

  return handleCreate;
};

export const NewProject = () => {
  const handleCreate = useNewProject();

  return (
    <Button prefix={<PlusIcon />} onClick={handleCreate}>
      New Project
    </Button>
  );
};
