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
  InputErrorsTooltip,
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

export type CreatePageData =
  | { ok: true; page: Page }
  | { errors: string | ZodError["formErrors"] };

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

  const fetcher = useFetcher<CreatePageData>();

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
              <IconButton size="2" onClick={onClose} aria-label="Cancel">
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
            <InputErrorsTooltip errors={fieldErrors.name}>
              <TextField
                state={fieldErrors.name && "invalid"}
                id={nameFieldId}
                name="name"
                disabled={isSubmitting}
                onChange={() => {
                  setFieldErrors(({ name, ...rest }) => rest);
                }}
              />
            </InputErrorsTooltip>
          </Group>
          <Group>
            <Label htmlFor={pathFieldId} size={2}>
              Path
            </Label>
            <InputErrorsTooltip errors={fieldErrors.path}>
              <TextField
                state={fieldErrors.path && "invalid"}
                id={pathFieldId}
                name="path"
                disabled={isSubmitting}
                onChange={() => {
                  setFieldErrors(({ path, ...rest }) => rest);
                }}
              />
            </InputErrorsTooltip>
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
