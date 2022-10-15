import {
  IconButton,
  Button,
  Box,
  Label,
  TextField,
  useId,
  styled,
  Flex,
  toast,
  Tooltip,
} from "@webstudio-is/design-system";
import { useFetcher, type FetcherWithComponents } from "@remix-run/react";
import { ChevronDoubleLeftIcon } from "@webstudio-is/icons";
import type { ZodError } from "zod";
import { BaseHeader } from "../../lib/header";
import { useEffect, useRef, useState } from "react";
import { type Page } from "@webstudio-is/project";

const Group = styled(Flex, {
  marginBottom: "$3",
  gap: "$2",
  defaultVariants: { direction: "column" },
});

export type PutPageData =
  | { ok: true; page: Page }
  | { errors: string | ZodError["formErrors"] };

const ErrorsTooltip = ({
  errors,
  children,
}: {
  errors: string[] | undefined;
  children: React.ComponentProps<typeof Tooltip>["children"];
}) => {
  const content = errors?.map((error, i) => <div key={i}>{error}</div>);
  return (
    // We intentionally always pass non empty content to avoid optimization inside Tooltip
    // where it renders {children} directly if content is empty.
    // If this optimization accur, the <TextField> will remount which will cause focus loss
    // and current value loss.
    <Tooltip content={content || " "} open={errors !== undefined}>
      {children}
    </Tooltip>
  );
};

export const NewPageSettings = ({
  onClose,
  onSuccess,
  onFetcherStateChange,
  projectId,
}: {
  onClose?: () => void;
  onSuccess?: (page: Page) => void;
  onFetcherStateChange?: (
    state: FetcherWithComponents<unknown>["state"]
  ) => void;
  projectId: string;
}) => {
  const nameFieldId = useId();
  const pathFieldId = useId();

  const fetcher = useFetcher<PutPageData>();

  const [fieldErrors, setFieldErrors] = useState<
    ZodError["formErrors"]["fieldErrors"]
  >({});

  const isSubmitting = fetcher.state !== "idle";

  const prevFetcher = useRef(fetcher);
  useEffect(() => {
    if (prevFetcher.current.state !== fetcher.state) {
      onFetcherStateChange?.(fetcher.state);
      if (fetcher.state === "idle" && fetcher.data !== undefined) {
        if ("ok" in fetcher.data) {
          onSuccess?.(fetcher.data.page);
        } else {
          const errors =
            typeof fetcher.data.errors === "string"
              ? { formErrors: [fetcher.data.errors], fieldErrors: {} }
              : fetcher.data.errors;

          if (errors.formErrors.length > 0) {
            for (const message of errors.formErrors) {
              toast.error(message);
            }
          }
          setFieldErrors(errors.fieldErrors);
        }
      }
    }
    prevFetcher.current = fetcher;
  }, [fetcher, onSuccess, onFetcherStateChange]);

  return (
    <>
      <BaseHeader
        title="New Page Settings"
        actions={
          <>
            {onClose && (
              <IconButton size="2" onClick={onClose} aria-label="Close">
                <ChevronDoubleLeftIcon />
              </IconButton>
            )}
          </>
        }
      />
      <Box css={{ overflow: "auto", padding: "$2 $3" }}>
        <fetcher.Form method="put" action={`/rest/pages/${projectId}`}>
          <Group>
            <Label htmlFor={nameFieldId} size={2}>
              Page Name
            </Label>
            <ErrorsTooltip errors={fieldErrors.name}>
              <TextField
                state={fieldErrors.name && "invalid"}
                id={nameFieldId}
                name="name"
                disabled={isSubmitting}
                onChange={() => {
                  setFieldErrors(({ name, ...rest }) => rest);
                }}
              />
            </ErrorsTooltip>
          </Group>
          <Group>
            <Label htmlFor={pathFieldId} size={2}>
              Path
            </Label>
            <ErrorsTooltip errors={fieldErrors.path}>
              <TextField
                state={fieldErrors.path && "invalid"}
                id={pathFieldId}
                name="path"
                disabled={isSubmitting}
                onChange={() => {
                  setFieldErrors(({ path, ...rest }) => rest);
                }}
              />
            </ErrorsTooltip>
          </Group>
          <Group css={{ alignItems: "end" }}>
            <Button type="submit" variant="green" disabled={isSubmitting}>
              Create
            </Button>
          </Group>
        </fetcher.Form>
      </Box>
    </>
  );
};
