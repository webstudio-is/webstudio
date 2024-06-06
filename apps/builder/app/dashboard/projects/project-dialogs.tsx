import { useEffect, useState } from "react";
import { useNavigate } from "@remix-run/react";
import {
  Box,
  Button,
  Flex,
  Label,
  Text,
  DeprecatedTextField,
  DialogActions,
  Dialog as BaseDialog,
  DialogTrigger,
  DialogContent as DialogContentBase,
  DialogTitle,
  DialogClose,
  DialogDescription,
  theme,
} from "@webstudio-is/design-system";
import { PlusIcon } from "@webstudio-is/icons";
import type { DashboardProject } from "@webstudio-is/prisma-client";
import { Title } from "@webstudio-is/project";
import { builderPath } from "~/shared/router-utils";
import { ShareProjectContainer } from "~/shared/share-project";
import { trpcClient } from "~/shared/trpc/trpc-client";
import { useRevalidator } from "@remix-run/react";

type DialogProps = {
  title: string;
  children: JSX.Element | Array<JSX.Element>;
  trigger?: JSX.Element;
  onOpenChange?: (open: boolean) => void;
  isOpen?: boolean;
};

const Dialog = ({
  title,
  children,
  trigger,
  onOpenChange,
  isOpen,
}: DialogProps) => {
  return (
    <BaseDialog open={isOpen} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContentBase>
        {children}
        <DialogTitle>{title}</DialogTitle>
      </DialogContentBase>
    </BaseDialog>
  );
};

const DialogContent = ({
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
            <Text as="p">{description}</Text>
          </DialogDescription>
        )}
        {typeof label === "string" ? <Label>{label}</Label> : label}
        <DeprecatedTextField
          placeholder={placeholder}
          name="title"
          defaultValue={title}
          state={errors ? "invalid" : undefined}
          onChange={(event) => {
            onChange?.({ title: event.currentTarget.value });
          }}
        />
        <Box css={{ minHeight: theme.spacing["10"] }}>
          {errors && <Text color="destructive">{errors}</Text>}
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

const useCreateProject = () => {
  const navigate = useNavigate();
  const { send, state } = trpcClient.dashboardProject.create.useMutation();
  const [errors, setErrors] = useState<string>();
  const revalidator = useRevalidator();

  const handleSubmit = ({ title }: { title: string }) => {
    const parsed = Title.safeParse(title);
    const errors =
      "error" in parsed
        ? parsed.error.issues.map((issue) => issue.message).join("\n")
        : undefined;
    setErrors(errors);
    if (parsed.success) {
      send({ title }, (data) => {
        revalidator.revalidate();
        if (data?.id) {
          navigate(builderPath({ projectId: data.id }));
        }
      });
    }
  };

  const handleOpenChange = () => {
    setErrors(undefined);
  };

  return {
    handleSubmit,
    handleOpenChange,
    state,
    errors,
  };
};

export const CreateProject = ({
  buttonText = "New Project",
}: {
  buttonText?: string;
}) => {
  const { handleSubmit, handleOpenChange, state, errors } = useCreateProject();

  return (
    <Dialog
      title="New Project"
      trigger={<Button prefix={<PlusIcon />}>{buttonText}</Button>}
      onOpenChange={handleOpenChange}
    >
      <DialogContent
        onSubmit={handleSubmit}
        placeholder="New Project"
        label="Project Title"
        errors={errors}
        primaryButton={
          <Button
            state={state === "idle" ? undefined : "pending"}
            type="submit"
          >
            Create Project
          </Button>
        }
      />
    </Dialog>
  );
};

const useRenameProject = ({
  projectId,
  onOpenChange,
}: {
  projectId: DashboardProject["id"];
  onOpenChange: (isOpen: boolean) => void;
}) => {
  const { send, state } = trpcClient.dashboardProject.rename.useMutation();
  const [errors, setErrors] = useState<string>();
  const revalidator = useRevalidator();

  const handleSubmit = ({ title }: { title: string }) => {
    const parsed = Title.safeParse(title);
    const errors =
      "error" in parsed
        ? parsed.error.issues.map((issue) => issue.message).join("\n")
        : undefined;
    setErrors(errors);
    if (parsed.success) {
      send({ projectId, title }, () => {
        revalidator.revalidate();
      });
      onOpenChange(false);
    }
  };

  return {
    handleSubmit,
    errors,
    state,
  };
};

export const RenameProjectDialog = ({
  isOpen,
  title,
  projectId,
  onOpenChange,
}: {
  isOpen: boolean;
  title: string;
  projectId: DashboardProject["id"];
  onOpenChange: (isOpen: boolean) => void;
}) => {
  const { handleSubmit, errors, state } = useRenameProject({
    projectId,
    onOpenChange,
  });
  return (
    <Dialog title="Rename" isOpen={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        onSubmit={handleSubmit}
        errors={errors}
        title={title}
        label="Project Title"
        primaryButton={
          <Button
            type="submit"
            state={state === "idle" ? undefined : "pending"}
          >
            Rename Project
          </Button>
        }
      />
    </Dialog>
  );
};

const useDeleteProject = ({
  projectId,
  title,
  onOpenChange,
  onHiddenChange,
}: {
  projectId: DashboardProject["id"];
  title: string;
  onOpenChange: (isOpen: boolean) => void;
  onHiddenChange: (isHidden: boolean) => void;
}) => {
  const { send, data, state } =
    trpcClient.dashboardProject.delete.useMutation();
  const [isMatch, setIsMatch] = useState(false);
  const errors = data && "errors" in data ? data.errors : undefined;
  const revalidator = useRevalidator();

  useEffect(() => {
    if (errors) {
      onOpenChange(true);
      onHiddenChange(false);
    }
  }, [errors, onOpenChange, onHiddenChange]);

  const handleSubmit = () => {
    send({ projectId }, () => {
      revalidator.revalidate();
    });
    onHiddenChange(true);
    onOpenChange(false);
  };

  const handleChange = ({ title: currentTitle }: { title: string }) => {
    setIsMatch(currentTitle.trim().toLowerCase() === title.toLowerCase());
  };

  return {
    handleSubmit,
    handleChange,
    errors,
    isMatch,
    state,
  };
};

export const DeleteProjectDialog = ({
  isOpen,
  title,
  projectId,
  onOpenChange,
  onHiddenChange,
}: {
  isOpen: boolean;
  title: string;
  projectId: DashboardProject["id"];
  onOpenChange: (isOpen: boolean) => void;
  onHiddenChange: (isHidden: boolean) => void;
}) => {
  const { handleSubmit, handleChange, errors, isMatch, state } =
    useDeleteProject({
      projectId,
      title,
      onOpenChange,
      onHiddenChange,
    });
  return (
    <Dialog
      title="Delete Confirmation"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        onSubmit={handleSubmit}
        onChange={handleChange}
        errors={errors}
        label={
          <Label css={{ userSelect: "text" }}>
            Confirm by typing
            <Text
              as="span"
              color="destructive"
              variant="labelsSentenceCase"
              css={{ userSelect: "text" }}
            >
              {` ${title} `}
            </Text>
            below.
          </Label>
        }
        description="This project and its styles, pages and images will be deleted permanently."
        primaryButton={
          <Button
            type="submit"
            color="destructive"
            disabled={isMatch === false}
            state={state === "idle" ? undefined : "pending"}
          >
            Delete Forever
          </Button>
        }
        width={theme.spacing["33"]}
      />
    </Dialog>
  );
};

export const useCloneProject = (projectId: DashboardProject["id"]) => {
  const { send } = trpcClient.dashboardProject.clone.useMutation();
  const revalidator = useRevalidator();

  return () => {
    send({ projectId }, () => {
      revalidator.revalidate();
    });
  };
};

export const ShareProjectDialog = ({
  isOpen,
  onOpenChange,
  projectId,
  hasProPlan,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  projectId: DashboardProject["id"];
  hasProPlan: boolean;
}) => {
  return (
    <Dialog title="Share Project" isOpen={isOpen} onOpenChange={onOpenChange}>
      <ShareProjectContainer hasProPlan={hasProPlan} projectId={projectId} />
    </Dialog>
  );
};
