import type { DashboardProjectRouter } from "@webstudio-is/dashboard";
import {
  Box,
  Button,
  Flex,
  Label,
  Text,
  TextField,
  theme,
} from "@webstudio-is/design-system";
import { PlusIcon } from "@webstudio-is/icons";
import { FormEventHandler, useEffect } from "react";
import { useNavigate } from "@remix-run/react";
import { dashboardProjectPath, designerPath } from "~/shared/router-utils";
import { createTrpcRemixProxy } from "~/shared/remix/trpc-remix-proxy";
import { DialogActions, DialogClose, Dialog } from "./dialog";

const trpc = createTrpcRemixProxy<DashboardProjectRouter>(dashboardProjectPath);

const useForm = () => {
  const { send, data } = trpc.create.useMutation();
  const navigate = useNavigate();

  useEffect(() => {
    if (data === undefined || "errors" in data) {
      return;
    }
    navigate(designerPath({ projectId: data.id }));
  }, [data, navigate]);

  const handleSubmit: FormEventHandler = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget as HTMLFormElement);
    const title = String(formData.get("title") ?? "");
    send({ title });
  };

  return {
    handleSubmit,
    errors: data && "errors" in data ? data.errors : undefined,
  };
};

const Content = () => {
  const { handleSubmit, errors } = useForm();
  return (
    <form onSubmit={handleSubmit}>
      <Flex
        direction="column"
        css={{
          px: theme.spacing["9"],
          paddingTop: theme.spacing["5"],
        }}
        gap="1"
      >
        <Label>Project Title</Label>
        <TextField
          placeholder="New Project"
          name="title"
          state={errors ? "invalid" : undefined}
        />
        <Box css={{ minHeight: theme.spacing["10"] }}>
          {errors && <Text color="error">{errors}</Text>}
        </Box>
      </Flex>
      <DialogActions>
        <Button type="submit">Create Project</Button>
        <DialogClose asChild>
          <Button color="ghost">Cancel</Button>
        </DialogClose>
      </DialogActions>
    </form>
  );
};

export const CreateProject = () => {
  return (
    <Dialog
      title="New Project"
      trigger={<Button prefix={<PlusIcon />}>New Project</Button>}
    >
      <Content />
    </Dialog>
  );
};
