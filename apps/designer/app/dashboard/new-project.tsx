import { useFetcher } from "@remix-run/react";
import { Button, toast } from "@webstudio-is/design-system";
import { PlusIcon } from "@webstudio-is/icons";
import { useEffect } from "react";

const useNewProject = () => {
  const fetcher = useFetcher();

  const handleCreate = () => {
    // @todo replace with the new dialog UI, waiting for dialog component
    const title = prompt("Project Title");
    // User has aborted
    if (title === null) {
      return;
    }
    fetcher.submit(
      { title },
      { method: "post", action: "/dashboard/projects/new" }
    );
  };

  // @todo with dialog it can be displayed in the dialog
  useEffect(() => {
    if (fetcher.data?.errors) {
      toast.error(fetcher.data.errors);
    }
  }, [fetcher.data]);

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
