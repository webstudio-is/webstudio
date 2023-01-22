import { useFetcher } from "@remix-run/react";
import { Button, toast } from "@webstudio-is/design-system";
import { PlusIcon } from "@webstudio-is/icons";
import { useEffect } from "react";

export const CreateProject = () => {
  const fetcher = useFetcher();

  const handleCreate = () => {
    // @todo replace with the new dialog UI, waiting for dialog component
    const project = prompt("Project Title");
    // User has aborted
    if (project === null) {
      return;
    }
    fetcher.submit({ project }, { method: "post" });
  };

  useEffect(() => {
    // @todo with dialog it can be displayed in the dialog
    if (fetcher.data?.errors) {
      toast.error(fetcher.data.errors);
    }
  }, [fetcher.data]);

  return (
    <Button prefix={<PlusIcon />} onClick={handleCreate}>
      New Project
    </Button>
  );
};
