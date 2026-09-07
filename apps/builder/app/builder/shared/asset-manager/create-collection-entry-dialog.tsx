import { useLayoutEffect, useState, type KeyboardEvent } from "react";
import {
  collectionEntryFieldClearValue,
  getCollectionFieldValidationIssue,
  normalizeCollectionSlug,
  type CollectionField,
} from "@webstudio-is/content-engine";
import type { Asset } from "@webstudio-is/sdk";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Flex,
  Grid,
  InputField,
  Label,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  SmallIconButton,
  ToggleGroup,
  ToggleGroupButton,
  Separator,
  Tooltip,
  cssVar,
  Text,
  TextArea,
  toast,
  theme,
} from "@webstudio-is/design-system";
import { EllipsesIcon, InfoCircleIcon } from "@webstudio-is/icons";
import { fetch } from "~/shared/fetch.client";
import { $assets, $project } from "~/shared/sync/data-stores";
import { getWebstudioData } from "~/shared/instance-utils/data";
import { createTransactionFromBuilderPatchPayload } from "~/shared/sync/builder-patch";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";
import { invalidateAssets } from "~/shared/resources";
import type { ContentCollection } from "../assets/content-collections";

const getInitialValue = (
  field: CollectionField,
  templateProperties: Readonly<Record<string, unknown>>
): unknown => {
  if (Object.hasOwn(templateProperties, field.key)) {
    return templateProperties[field.key];
  }
  if (field.type === "boolean") {
    return field.required ? false : undefined;
  }
  if (field.type === "number" || field.type === "integer") {
    return "";
  }
  return "";
};

const optionalBooleanOptions = [
  { value: "unset", label: "Not set" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
] as const;

const createInitialValues = (
  fields: readonly CollectionField[],
  templateProperties: Readonly<Record<string, unknown>>
) =>
  Object.fromEntries(
    fields.flatMap((field) =>
      field.required || Object.hasOwn(templateProperties, field.key)
        ? [[field.key, getInitialValue(field, templateProperties)]]
        : []
    )
  );

const parseResponse = async (response: Response): Promise<Asset> => {
  const payload = (await response.json()) as
    | { asset: Asset }
    | { errors?: string };
  if (response.ok && "asset" in payload) {
    return payload.asset;
  }
  throw new Error(
    "errors" in payload && typeof payload.errors === "string"
      ? payload.errors
      : "The entry could not be created."
  );
};

export const createCollectionEntryRequest = async ({
  projectId,
  folderId,
  values,
}: {
  projectId: string;
  folderId: string;
  values: Readonly<Record<string, unknown>>;
}) => {
  const response = await fetch(
    `/rest/assets/folders/${encodeURIComponent(
      folderId
    )}/entries?projectId=${encodeURIComponent(projectId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    }
  );
  return parseResponse(response);
};

const stopEscapePropagation = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    event.stopPropagation();
  }
};

export const CreateCollectionEntryDialog = ({
  collection,
  open,
  onOpenChange,
  createEntry = createCollectionEntryRequest,
}: {
  collection: Extract<ContentCollection, { status: "ready" }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createEntry?: typeof createCollectionEntryRequest;
}) => {
  const { config } = collection;
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    createInitialValues(config.fields, collection.templateProperties)
  );
  const [slugEdited, setSlugEdited] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<{
    message: string;
    fieldKey?: string;
  }>();
  const [creating, setCreating] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useLayoutEffect(() => {
    if (open) {
      setValues(
        createInitialValues(config.fields, collection.templateProperties)
      );
      setSlugEdited(false);
      setDirty(false);
      setError(undefined);
      setCreating(false);
      setConfirmDiscard(false);
    }
  }, [collection.templateProperties, config.fields, open]);

  const setValue = (field: CollectionField, value: unknown) => {
    setDirty(true);
    setValues((current) => {
      const next = { ...current, [field.key]: value };
      if (
        field.key === config.generateSlugFrom &&
        slugEdited === false &&
        typeof value === "string"
      ) {
        next[config.slugField] = normalizeCollectionSlug(value);
      }
      return next;
    });
    setError(undefined);
  };

  const unsetValue = (field: CollectionField) => {
    setDirty(true);
    setValues((current) => {
      const next = { ...current };
      delete next[field.key];
      return next;
    });
    setError(undefined);
  };

  const submit = async () => {
    if (creating) {
      return;
    }
    setCreating(true);
    setError(undefined);
    try {
      const projectId = $project.get()?.id;
      if (projectId === undefined) {
        throw new Error("Project not found");
      }
      const submittedValues = Object.fromEntries(
        config.fields.flatMap((field) => {
          if (Object.hasOwn(values, field.key) === false) {
            return field.required === false &&
              Object.hasOwn(collection.templateProperties, field.key)
              ? [[field.key, collectionEntryFieldClearValue]]
              : [];
          }
          const value = values[field.key];
          if (
            (field.type === "number" || field.type === "integer") &&
            value !== ""
          ) {
            return [[field.key, Number(value)]];
          }
          return [[field.key, value]];
        })
      );
      const submittedSlug = submittedValues[config.slugField];
      if (typeof submittedSlug !== "string" || submittedSlug.trim() === "") {
        const slugSource = submittedValues[config.generateSlugFrom];
        if (typeof slugSource === "string") {
          submittedValues[config.slugField] =
            normalizeCollectionSlug(slugSource);
        }
      } else {
        submittedValues[config.slugField] =
          normalizeCollectionSlug(submittedSlug);
      }
      const validationIssue = getCollectionFieldValidationIssue(
        config,
        submittedValues
      );
      if (validationIssue !== undefined) {
        setError(validationIssue);
        requestAnimationFrame(() => {
          document
            .getElementById(`collection-entry-${validationIssue.fieldKey}`)
            ?.focus();
        });
        return;
      }
      const asset = await createEntry({
        projectId,
        folderId: collection.folderId,
        values: submittedValues,
      });
      if ($project.get()?.id !== projectId) {
        throw new Error(
          "The entry was created in the previous project. Return to that project to view it."
        );
      }
      if ($assets.get().has(asset.id)) {
        invalidateAssets();
      } else {
        createTransactionFromBuilderPatchPayload({
          data: getWebstudioData(),
          payload: [
            {
              namespace: "assets",
              patches: [{ op: "add", path: [asset.id], value: asset }],
            },
          ],
        });
        onNextTransactionComplete(invalidateAssets);
      }
      onOpenChange(false);
      toast.success("Entry created.");
    } catch (error) {
      setError({
        message:
          error instanceof Error
            ? error.message
            : "The entry could not be created.",
      });
    } finally {
      setCreating(false);
    }
  };
  const requestClose = () => {
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (creating === false && nextOpen === false) {
          requestClose();
        }
      }}
    >
      <DialogContent
        css={{
          width: "min(560px, calc(100vw - 32px))",
        }}
        aria-describedby={undefined}
        onKeyDown={stopEscapePropagation}
      >
        <DialogTitle>New entry</DialogTitle>
        <Flex
          as="form"
          direction="column"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          css={{ minHeight: 0, maxHeight: "min(640px, calc(100vh - 96px))" }}
        >
          <Grid
            gap={4}
            css={{
              padding: theme.spacing[9],
              overflow: "auto",
              minHeight: 0,
              gridAutoRows: "max-content",
              alignContent: "start",
            }}
          >
            {config.fields.map((field, index) => {
              const value = values[field.key];
              const id = `collection-entry-${field.key}`;
              const hasFieldError = error?.fieldKey === field.key;
              const errorId = hasFieldError ? `${id}-error` : undefined;
              const booleanField = field.type === "boolean";
              return (
                <Grid
                  key={field.key}
                  gap={1}
                  css={{
                    gridTemplateColumns: booleanField ? "1fr auto" : undefined,
                    alignItems: "center",
                  }}
                >
                  <Flex justify="between" align="center" gap={2}>
                    <Flex gap={1} align="center">
                      <Label htmlFor={id}>
                        {field.label}
                        {field.required ? " *" : ""}
                      </Label>
                      {field.key === config.slugField && (
                        <Tooltip
                          variant="wrapped"
                          content={`Generated from ${config.fields.find(({ key }) => key === config.generateSlugFrom)?.label ?? config.generateSlugFrom}. You can edit it before creating the entry. It becomes the MDX filename.`}
                        >
                          <InfoCircleIcon
                            tabIndex={0}
                            aria-label="About entry slug"
                            color={cssVar("--foreground-secondary")}
                          />
                        </Tooltip>
                      )}
                    </Flex>
                    {!field.required && !booleanField && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SmallIconButton
                            type="button"
                            aria-label={`${field.label} actions`}
                            disabled={creating}
                            icon={<EllipsesIcon />}
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            disabled={!Object.hasOwn(values, field.key)}
                            onSelect={() => unsetValue(field)}
                          >
                            Clear value
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </Flex>
                  {booleanField ? (
                    <ToggleGroup
                      id={id}
                      type="single"
                      aria-label={field.label}
                      aria-describedby={errorId}
                      aria-invalid={hasFieldError || undefined}
                      value={
                        value === true
                          ? "true"
                          : value === false
                            ? "false"
                            : "unset"
                      }
                      disabled={creating}
                      onValueChange={(value) =>
                        value === "unset"
                          ? unsetValue(field)
                          : setValue(field, value === "true")
                      }
                    >
                      {optionalBooleanOptions
                        .filter(
                          ({ value }) => !field.required || value !== "unset"
                        )
                        .map(({ value, label }) => (
                          <ToggleGroupButton
                            key={value}
                            value={value}
                            css={{
                              width: "auto",
                              paddingInline: theme.spacing[3],
                            }}
                          >
                            {label}
                          </ToggleGroupButton>
                        ))}
                    </ToggleGroup>
                  ) : field.control === "textarea" ? (
                    <TextArea
                      id={id}
                      autoFocus={index === 0}
                      required={field.required}
                      aria-required={field.required}
                      aria-describedby={errorId}
                      aria-invalid={hasFieldError || undefined}
                      value={typeof value === "string" ? value : ""}
                      disabled={creating}
                      onChange={(value) => setValue(field, value)}
                    />
                  ) : (
                    <InputField
                      id={id}
                      autoFocus={index === 0}
                      type={
                        field.type === "number" || field.type === "integer"
                          ? "number"
                          : "text"
                      }
                      min={field.minimum}
                      max={field.maximum}
                      step={field.type === "integer" ? 1 : undefined}
                      required={field.required}
                      aria-required={field.required}
                      aria-describedby={errorId}
                      aria-invalid={hasFieldError || undefined}
                      color={hasFieldError ? "error" : undefined}
                      value={
                        typeof value === "string" ? value : String(value ?? "")
                      }
                      disabled={creating}
                      onChange={(event) => {
                        if (field.key === config.slugField) {
                          setSlugEdited(true);
                        }
                        if (
                          (field.type === "number" ||
                            field.type === "integer") &&
                          event.target.value === ""
                        ) {
                          unsetValue(field);
                          return;
                        }
                        setValue(field, event.target.value);
                      }}
                    />
                  )}
                  {hasFieldError && (
                    <Text
                      id={errorId}
                      role="alert"
                      color="destructive"
                      css={{ gridColumn: "1 / -1" }}
                    >
                      {error.message}
                    </Text>
                  )}
                </Grid>
              );
            })}
          </Grid>
          <Separator />
          <Flex
            direction="column"
            shrink={false}
            gap={2}
            css={{ padding: theme.panel.padding }}
          >
            {error !== undefined && error.fieldKey === undefined && (
              <Text role="alert" color="destructive">
                {error.message}
              </Text>
            )}
            <Flex justify="end">
              <Button type="submit" color="primary" disabled={creating}>
                {creating ? "Creating…" : "Create entry"}
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </DialogContent>
      <Dialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <DialogContent aria-describedby={undefined} width={420}>
          <DialogTitle>Discard entry?</DialogTitle>
          <Grid gap={3} css={{ padding: theme.panel.padding }}>
            <Text>Your unsaved entry values will be lost.</Text>
            <Flex justify="end" gap={2}>
              <Button onClick={() => setConfirmDiscard(false)}>
                Keep editing
              </Button>
              <Button
                color="destructive"
                onClick={() => {
                  setConfirmDiscard(false);
                  onOpenChange(false);
                }}
              >
                Discard entry
              </Button>
            </Flex>
          </Grid>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
