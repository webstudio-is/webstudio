import { useState } from "react";
import { useNavigate } from "@remix-run/react";
import {
  Box,
  Button,
  Flex,
  Label,
  Text,
  theme,
  InputField,
  DialogContent,
  DialogTitle,
  DialogClose,
  Dialog,
  DialogActions,
} from "@webstudio-is/design-system";
import { Title, type ProjectRouter, Project } from "@webstudio-is/project";
import { projectsPath, builderPath } from "~/shared/router-utils";
import { createTrpcRemixProxy } from "~/shared/remix/trpc-remix-proxy";

const trpc = createTrpcRemixProxy<ProjectRouter>(projectsPath);

const useCloneProject = ({
  projectId,
  onOpenChange,
}: {
  projectId: Project["id"];
  onOpenChange: (isOpen: boolean) => void;
}) => {
  const navigate = useNavigate();
  const { send, state } = trpc.clone.useMutation();
  const [errors, setErrors] = useState<string>();

  const handleSubmit = ({ title }: { title: string }) => {
    const parsed = Title.safeParse(title);
    const errors =
      "error" in parsed
        ? parsed.error.issues.map((issue) => issue.message).join("\n")
        : undefined;

    setErrors(errors);

    if (parsed.success) {
      send({ projectId, title }, (data) => {
        if (data?.id) {
          navigate(builderPath({ projectId: data.id }));
          onOpenChange(false);
        }
      });
    }
  };

  return {
    handleSubmit,
    errors,
    state,
  };
};

const CloneProjectView = ({
  isOpen,
  title,
  errors,
  state,
  onOpenChange,
  onSubmit,
}: {
  isOpen: boolean;
  title: string;
  errors?: string;
  state: "idle" | "loading" | "submitting";
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: ({ title }: { title: string }) => void;
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent css={{ zIndex: theme.zIndices[1] }}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(
              event.currentTarget as HTMLFormElement
            );
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
            <InputField
              name="title"
              defaultValue={title}
              color={errors ? "error" : undefined}
            />
            <Box css={{ minHeight: theme.spacing["10"] }}>
              {errors && <Text color="destructive">{errors}</Text>}
            </Box>
          </Flex>
          <DialogActions>
            <Button
              type="submit"
              state={state === "idle" ? undefined : "pending"}
            >
              Clone
            </Button>
            <DialogClose asChild>
              <Button color="ghost">Cancel</Button>
            </DialogClose>
          </DialogActions>
        </form>
        <DialogTitle>Clone Project</DialogTitle>
      </DialogContent>
    </Dialog>
  );
};

export const CloneProjectDialog = ({
  isOpen,
  project: { id, title },
  onOpenChange,
}: {
  isOpen: boolean;
  project: Project;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  const { handleSubmit, errors, state } = useCloneProject({
    projectId: id,
    onOpenChange,
  });

  return (
    <CloneProjectView
      title={title}
      onSubmit={handleSubmit}
      errors={errors}
      state={state}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    />
  );
};
