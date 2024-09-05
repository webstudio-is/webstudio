import { useState } from "react";
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
  toast,
} from "@webstudio-is/design-system";
import { Title, Project } from "@webstudio-is/project";
import { builderUrl } from "~/shared/router-utils";
import { nativeClient } from "./trpc/trpc-client";

const useCloneProject = ({
  projectId,
  onOpenChange,
  authToken,
}: {
  projectId: Project["id"];
  authToken?: string;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  const [state, setState] = useState<"idle" | "loading" | "submitting">("idle");
  const [errors, setErrors] = useState<string>();

  const handleSubmit = async ({ title }: { title: string }) => {
    const parsed = Title.safeParse(title);
    const errors =
      "error" in parsed
        ? parsed.error.issues.map((issue) => issue.message).join("\n")
        : undefined;

    setErrors(errors);

    if (parsed.success) {
      try {
        setState("submitting");

        const data = await nativeClient.project.clone.mutate({
          projectId,
          title,
          authToken,
        });

        window.location.href = builderUrl({
          origin: window.origin,
          projectId: data.id,
        });

        setState("idle");

        onOpenChange(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unknown error");
        setState("idle");
      }
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
      <DialogContent>
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
  authToken,
}: {
  isOpen: boolean;
  project: Pick<Project, "id" | "title">;
  authToken?: string;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  const { handleSubmit, errors, state } = useCloneProject({
    projectId: id,
    onOpenChange,
    authToken,
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
