import {
  IconButton,
  Button,
  Box,
  Label,
  TextField,
  useId,
  styled,
  Flex,
} from "@webstudio-is/design-system";
import { type FetcherWithComponents } from "@remix-run/react";
import { ChevronDoubleLeftIcon } from "@webstudio-is/icons";
import type { ZodError } from "zod";
import { BaseHeader } from "../../lib/header";
import { useEffect, useRef } from "react";
import { type Page } from "@webstudio-is/project";

const Group = styled(Flex, {
  marginBottom: "$3",
  gap: "$2",
  defaultVariants: { direction: "column" },
});

export type PutPageData =
  | { ok: true; page: Page }
  | { errors: string | ZodError["formErrors"] };

const getErrors = (
  fetcher: FetcherWithComponents<PutPageData>
): ZodError["formErrors"] | undefined => {
  if (fetcher.data === undefined || !("errors" in fetcher.data)) {
    return undefined;
  }
  if (typeof fetcher.data.errors === "string") {
    return { formErrors: [fetcher.data.errors], fieldErrors: {} };
  }
  return fetcher.data.errors;
};

export const NewPageSettings = ({
  onClose,
  onSuccess,
  fetcher,
  projectId,
}: {
  onClose?: () => void;
  onSuccess?: (page: Page) => void;
  fetcher: FetcherWithComponents<PutPageData>;
  projectId: string;
}) => {
  const nameFieldId = useId();
  const pathFieldId = useId();

  const errors = getErrors(fetcher);

  const isSubmitting = fetcher.state !== "idle";

  const prevFetcher = useRef(fetcher);
  useEffect(() => {
    if (
      prevFetcher.current.state !== "idle" &&
      fetcher.state === "idle" &&
      fetcher.data !== undefined &&
      "ok" in fetcher.data
    ) {
      onSuccess?.(fetcher.data.page);
    }
    prevFetcher.current = fetcher;
  }, [fetcher, onSuccess]);

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
          {/* @todo: banner? toast? */}
          {errors !== undefined &&
            errors.formErrors.length > 0 &&
            JSON.stringify(errors.formErrors)}

          <Group>
            <Label htmlFor={nameFieldId} size={2}>
              Page Name
            </Label>
            <TextField id={nameFieldId} name="name" disabled={isSubmitting} />
            {/* @todo: tooltip */}
            {errors !== undefined &&
              errors.fieldErrors.name !== undefined &&
              JSON.stringify(errors.fieldErrors.name)}
          </Group>
          <Group>
            <Label htmlFor={pathFieldId} size={2}>
              Path
            </Label>
            <TextField id={pathFieldId} name="path" disabled={isSubmitting} />
            {/* @todo: tooltip */}
            {errors !== undefined &&
              errors.fieldErrors.path !== undefined &&
              JSON.stringify(errors.fieldErrors.path)}
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
