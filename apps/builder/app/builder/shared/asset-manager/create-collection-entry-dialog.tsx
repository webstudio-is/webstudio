import { useLayoutEffect, useState, type KeyboardEvent } from "react";
import {
  normalizeCollectionSlug,
  type CollectionField,
} from "@webstudio-is/content-engine";
import type { Asset } from "@webstudio-is/sdk";
import {
  Button,
  Checkbox,
  CheckboxAndLabel,
  Dialog,
  DialogContent,
  DialogTitle,
  Flex,
  Grid,
  InputField,
  Label,
  Text,
  TextArea,
  toast,
  theme,
} from "@webstudio-is/design-system";
import { fetch } from "~/shared/fetch.client";
import { $project } from "~/shared/sync/data-stores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";
import { invalidateAssets } from "~/shared/resources";
import type { ContentCollection } from "../assets/content-collections";

const getInitialValue = (field: CollectionField): unknown => {
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }
  if (field.type === "boolean") {
    return false;
  }
  if (field.type === "number" || field.type === "integer") {
    return "";
  }
  return "";
};

const createInitialValues = (fields: readonly CollectionField[]) =>
  Object.fromEntries(
    fields.map((field) => [field.key, getInitialValue(field)])
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
  folderId,
  values,
}: {
  folderId: string;
  values: Readonly<Record<string, unknown>>;
}) => {
  const projectId = $project.get()?.id;
  if (projectId === undefined) {
    throw new Error("Project not found");
  }
  const response = await fetch(
    `/rest/assets/folders/${encodeURIComponent(folderId)}/entries?projectId=${encodeURIComponent(projectId)}`,
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
}: {
  collection: Extract<ContentCollection, { status: "ready" }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { config } = collection;
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    createInitialValues(config.fields)
  );
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string>();
  const [creating, setCreating] = useState(false);

  useLayoutEffect(() => {
    if (open) {
      setValues(createInitialValues(config.fields));
      setSlugEdited(false);
      setError(undefined);
      setCreating(false);
    }
  }, [config.fields, open]);

  const setValue = (field: CollectionField, value: unknown) => {
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

  const submit = async () => {
    if (creating) {
      return;
    }
    setCreating(true);
    setError(undefined);
    try {
      const submittedValues = Object.fromEntries(
        config.fields.flatMap((field) => {
          const value = values[field.key];
          if (field.required === false && value === "") {
            return [];
          }
          if (
            (field.type === "number" || field.type === "integer") &&
            value !== ""
          ) {
            return [[field.key, Number(value)]];
          }
          return [[field.key, value]];
        })
      );
      const asset = await createCollectionEntryRequest({
        folderId: collection.folderId,
        values: submittedValues,
      });
      executeRuntimeMutation({ id: "assets.add", input: { asset } });
      onNextTransactionComplete(invalidateAssets);
      onOpenChange(false);
      toast.success("Entry created.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The entry could not be created."
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        minWidth={400}
        aria-describedby={undefined}
        onKeyDown={stopEscapePropagation}
      >
        <DialogTitle>New entry</DialogTitle>
        <Grid gap={3} css={{ padding: theme.panel.padding }}>
          {config.fields.map((field, index) => {
            const value = values[field.key];
            const id = `collection-entry-${field.key}`;
            if (field.type === "boolean") {
              return (
                <CheckboxAndLabel key={field.key}>
                  <Checkbox
                    id={id}
                    checked={value === true}
                    onCheckedChange={(checked) =>
                      setValue(field, checked === true)
                    }
                  />
                  <Label htmlFor={id}>{field.label}</Label>
                </CheckboxAndLabel>
              );
            }
            if (field.control === "textarea") {
              return (
                <Grid key={field.key} gap={1}>
                  <Label htmlFor={id}>
                    {field.label}
                    {field.required ? " *" : ""}
                  </Label>
                  <TextArea
                    id={id}
                    minLength={field.minLength}
                    maxLength={field.maxLength}
                    value={typeof value === "string" ? value : ""}
                    disabled={creating}
                    onChange={(value) => setValue(field, value)}
                  />
                </Grid>
              );
            }
            return (
              <Grid key={field.key} gap={1}>
                <Label htmlFor={id}>
                  {field.label}
                  {field.required ? " *" : ""}
                </Label>
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
                  minLength={field.minLength}
                  maxLength={field.maxLength}
                  value={
                    typeof value === "string" ? value : String(value ?? "")
                  }
                  disabled={creating}
                  onChange={(event) => {
                    if (field.key === config.slugField) {
                      setSlugEdited(true);
                    }
                    setValue(field, event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void submit();
                    }
                  }}
                />
              </Grid>
            );
          })}
          {error !== undefined && (
            <Text color="destructive" variant="tiny">
              {error}
            </Text>
          )}
          <Flex justify="end">
            <Button
              color="primary"
              disabled={creating}
              onClick={() => void submit()}
            >
              {creating ? "Creating…" : "Create entry"}
            </Button>
          </Flex>
        </Grid>
      </DialogContent>
    </Dialog>
  );
};
