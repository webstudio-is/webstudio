import type { DashboardProjectRouter } from "@webstudio-is/dashboard";
import {
  Box,
  Button,
  Flex,
  Label,
  Paragraph,
  Text,
  TextField,
  theme,
} from "@webstudio-is/design-system";
import { PlusIcon } from "@webstudio-is/icons";
import { useEffect, useState } from "react";
import { useNavigate } from "@remix-run/react";
import { dashboardProjectPath, designerPath } from "~/shared/router-utils";
import { createTrpcRemixProxy } from "~/shared/remix/trpc-remix-proxy";
import {
  DialogActions,
  DialogClose,
  Dialog,
  DialogDescription,
} from "./dialog";
import { DashboardProject } from "@webstudio-is/prisma-client";

const Content = ({
  onSubmit,
  onChange,
  placeholder,
  errors,
  primaryButton,
  title,
  description,
  label,
  width,
}: {
  onSubmit: (data: { title: string }) => void;
  onChange?: (data: { title: string }) => void;
  errors?: string;
  placeholder?: string;
  title?: string;
  label: string | JSX.Element;
  description?: string;
  primaryButton: JSX.Element;
  width?: string;
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
          width,
        }}
        gap="1"
      >
        {description && (
          <DialogDescription asChild>
            <Paragraph>{description}</Paragraph>
          </DialogDescription>
        )}
        <Label>{label}</Label>
        <TextField
          placeholder={placeholder}
          name="title"
          defaultValue={title}
          state={errors ? "invalid" : undefined}
          onChange={(event) => {
            onChange?.({ title: event.currentTarget.value });
          }}
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
    handleSubmit: submit,
    errors: data && "errors" in data ? data.errors : undefined,
  };
};

export const CreateProject = () => {
  const { handleSubmit, errors } = useCreateProject();
  return (
    <Dialog
      title="New Project"
      trigger={<Button prefix={<PlusIcon />}>New Project</Button>}
    >
      <Content
        onSubmit={handleSubmit}
        errors={errors}
        placeholder="New Project"
        label="Project Title"
        primaryButton={<Button type="submit">Create Project</Button>}
      />
    </Dialog>
  );
};

const useRenameProject = ({
  projectId,
  onComplete,
}: {
  projectId: DashboardProject["id"];
  onComplete: () => void;
}) => {
  const { submit, data } = trpc.rename.useMutation();

  useEffect(() => {
    if (data === undefined || "errors" in data) {
      return;
    }
    onComplete();
  }, [data, onComplete]);

  const handleSubmit = ({ title }: { title: string }) => {
    submit({ projectId, title });
  };

  return {
    handleSubmit,
    errors: data && "errors" in data ? data.errors : undefined,
  };
};

export const RenameProject = ({
  isOpen,
  title,
  projectId,
  onComplete,
  onOpenChange,
}: {
  isOpen: boolean;
  title: string;
  projectId: DashboardProject["id"];
  onComplete: () => void;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  const { handleSubmit, errors } = useRenameProject({ projectId, onComplete });
  return (
    <Dialog title="Rename" isOpen={isOpen} onOpenChange={onOpenChange}>
      <Content
        onSubmit={handleSubmit}
        errors={errors}
        title={title}
        label="Project Title"
        primaryButton={<Button type="submit">Rename Project</Button>}
      />
    </Dialog>
  );
};

const useDeleteProject = ({
  projectId,
  title,
  onComplete,
}: {
  projectId: DashboardProject["id"];
  title: string;
  onComplete: () => void;
}) => {
  const { submit, data } = trpc.delete.useMutation();
  const [isMatch, setIsMatch] = useState(false);

  useEffect(() => {
    if (data === undefined || "errors" in data) {
      return;
    }
    onComplete();
  }, [data, onComplete]);

  const handleSubmit = () => {
    submit({ projectId });
  };

  const handleChange = ({ title: currentTitle }: { title: string }) => {
    setIsMatch(currentTitle.trim().toLowerCase() === title.toLowerCase());
  };

  return {
    handleSubmit,
    handleChange,
    errors: data && "errors" in data ? data.errors : undefined,
    isMatch,
  };
};

export const DeleteProject = ({
  isOpen,
  title,
  projectId,
  onComplete,
  onOpenChange,
}: {
  isOpen: boolean;
  title: string;
  projectId: DashboardProject["id"];
  onComplete: () => void;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  const { handleSubmit, handleChange, errors, isMatch } = useDeleteProject({
    projectId,
    onComplete,
    title,
  });
  return (
    <Dialog
      title="DeleteConfirmation"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Content
        onSubmit={handleSubmit}
        onChange={handleChange}
        errors={errors}
        label={
          <>
            Confirm by typing{" "}
            <Text as="span" color="error" variant="label">
              {title}
            </Text>{" "}
            below
          </>
        }
        description="This project and its styles, pages and images will be deleted permanently."
        primaryButton={
          <Button
            type="submit"
            color="destructive"
            disabled={isMatch === false}
          >
            Delete Forever
          </Button>
        }
        width={theme.spacing["33"]}
      />
    </Dialog>
  );
};
