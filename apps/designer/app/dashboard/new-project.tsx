import type { DashboardProjectRouter } from "@webstudio-is/dashboard";
import {
  Box,
  Button,
  Flex,
  FloatingPanelDialog,
  Label,
  TextField,
  theme,
  toast,
} from "@webstudio-is/design-system";
import { PlusIcon } from "@webstudio-is/icons";
import { ChangeEventHandler, useEffect, useState } from "react";
import { useNavigate } from "@remix-run/react";
import { dashboardProjectPath, designerPath } from "~/shared/router-utils";
import { createTrpcRemixProxy } from "~/shared/remix/trpc-remix-proxy";

const trpc = createTrpcRemixProxy<DashboardProjectRouter>(dashboardProjectPath);
const useNewProject = () => {
  const { submit, data } = trpc.create.useMutation();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    setTitle(event.currentTarget.value.trim());
  };

  const handleCreate = () => {
    if (title === "") {
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

  return { handleChange, handleCreate };
};

export const NewProject = () => {
  const { handleCreate, handleChange } = useNewProject();

  return (
    <FloatingPanelDialog.Root>
      <FloatingPanelDialog.Trigger asChild>
        <Button prefix={<PlusIcon />}>New Project</Button>
      </FloatingPanelDialog.Trigger>
      <FloatingPanelDialog.Content>
        <FloatingPanelDialog.Description asChild>
          <Flex
            direction="column"
            css={{
              px: theme.spacing["9"],
              py: theme.spacing["5"],
              paddingBottom: theme.spacing["10"],
            }}
            gap="1"
          >
            <Label>Project Title</Label>
            <form onSubmit={handleCreate}>
              <TextField placeholder="New Project" onChange={handleChange} />
            </form>
          </Flex>
        </FloatingPanelDialog.Description>
        <Flex
          justify="end"
          css={{
            padding: theme.spacing["9"],
            paddingTop: theme.spacing["5"],
          }}
          gap="1"
        >
          <FloatingPanelDialog.Close asChild>
            <Button color="ghost">Cancel</Button>
          </FloatingPanelDialog.Close>
          <FloatingPanelDialog.Close asChild>
            <Button onClick={handleCreate}>Create Project</Button>
          </FloatingPanelDialog.Close>
        </Flex>
        <FloatingPanelDialog.Title>New Project</FloatingPanelDialog.Title>
      </FloatingPanelDialog.Content>
    </FloatingPanelDialog.Root>
  );
};
