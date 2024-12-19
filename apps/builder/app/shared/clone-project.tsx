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
import { Title, type Project } from "@webstudio-is/project";
import { nativeClient } from "./trpc/trpc-client";
import { useEffectEvent } from "./hook-utils/effect-event";

const useCloneProject = ({
  projectId,
  onCreate,
  authToken,
}: {
  projectId: Project["id"];
  authToken?: string;
  onCreate: (projectId: Project["id"]) => void;
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

        setState("idle");

        onCreate(data.id);
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
              px: theme.spacing["7"],
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
            <DialogClose>
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
  onCreate,
}: {
  isOpen: boolean;
  project: Pick<Project, "id" | "title">;
  authToken?: string;
  onOpenChange: (isOpen: boolean) => void;
  onCreate: (projectId: Project["id"]) => void;
}) => {
  const handleOnCreate = useEffectEvent((projectId: Project["id"]) => {
    onCreate(projectId);
    onOpenChange(false);
  });

  const { handleSubmit, errors, state } = useCloneProject({
    projectId: id,
    authToken,
    onCreate: handleOnCreate,
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
