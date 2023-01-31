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
import { useEffect } from "react";
import { useNavigate } from "@remix-run/react";
import { dashboardProjectPath, designerPath } from "~/shared/router-utils";
import { createTrpcRemixProxy } from "~/shared/remix/trpc-remix-proxy";
import { DialogActions, DialogClose, Dialog } from "./dialog";

const Content = ({
  onSubmit,
  placeholder,
  errors,
  primaryButton,
}: {
  onSubmit: (data: { title: string }) => void;
  errors?: string;
  placeholder?: string;
  primaryButton: JSX.Element;
}) => {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget as HTMLFormElement);
        const title = String(formData.get("title") ?? "");
        onSubmit({ title });
      }}
    >
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
          placeholder={placeholder}
          name="title"
          state={errors ? "invalid" : undefined}
        />
        <Box css={{ minHeight: theme.spacing["10"] }}>
          {errors && <Text color="error">{errors}</Text>}
        </Box>
      </Flex>
      <DialogActions>
        {primaryButton}
        <DialogClose asChild>
          <Button color="ghost">Cancel</Button>
        </DialogClose>
      </DialogActions>
    </form>
  );
};

const trpc = createTrpcRemixProxy<DashboardProjectRouter>(dashboardProjectPath);

const useCreateProject = () => {
  const navigate = useNavigate();
  const { submit, data } = trpc.create.useMutation();

  useEffect(() => {
    if (data === undefined || "errors" in data) {
      return;
    }
    navigate(designerPath({ projectId: data.id }));
  }, [data, navigate]);

  return {
    submit,
    errors: data && "errors" in data ? data.errors : undefined,
  };
};

export const CreateProject = () => {
  const { submit, errors } = useCreateProject();
  return (
    <Dialog
      title="New Project"
      trigger={<Button prefix={<PlusIcon />}>New Project</Button>}
    >
      <Content
        onSubmit={submit}
        errors={errors}
        placeholder="New Project"
        primaryButton={<Button type="submit">Create Project</Button>}
      />
    </Dialog>
  );
};
