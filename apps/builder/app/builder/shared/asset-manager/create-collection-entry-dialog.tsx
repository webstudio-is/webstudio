import { useLayoutEffect, useState, type KeyboardEvent } from "react";
import {
  getCollectionFieldValidationError,
  normalizeCollectionSlug,
  type CollectionField,
} from "@webstudio-is/content-engine";
import {
  findPageByIdOrPath,
  getAssetDisplayNameParts,
  getPagePath,
  type Asset,
} from "@webstudio-is/sdk";
import { tokenizePathnamePattern } from "@webstudio-is/project-build/runtime";
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
import { $pages, $project } from "~/shared/sync/data-stores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";
import { invalidateAssets } from "~/shared/resources";
import type { ContentCollection } from "../assets/content-collections";
import { selectPage } from "~/shared/nano-states";
import { $currentSystem, updateCurrentSystem } from "~/shared/system";

const getInitialValue = (
  field: CollectionField,
  templateProperties: Readonly<Record<string, unknown>>
): unknown => {
  if (Object.hasOwn(templateProperties, field.key)) {
    return templateProperties[field.key];
  }
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

const createInitialValues = (
  fields: readonly CollectionField[],
  templateProperties: Readonly<Record<string, unknown>>
) =>
  Object.fromEntries(
    fields.map((field) => [
      field.key,
      getInitialValue(field, templateProperties),
    ])
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

const openConfiguredPreview = ({
  collection,
  asset,
}: {
  collection: Extract<ContentCollection, { status: "ready" }>;
  asset: Asset;
}) => {
  const previewPage = collection.config.previewPage;
  const pages = $pages.get();
  if (previewPage === undefined || pages === undefined) {
    return false;
  }
  const page = findPageByIdOrPath(previewPage, pages);
  if (page === undefined) {
    return false;
  }
  const parameters = tokenizePathnamePattern(
    getPagePath(page.id, pages)
  ).flatMap((token) => (token.type === "param" ? [token] : []));
  const parameter =
    parameters.find(({ name }) => name === collection.config.slugField) ??
    parameters[0];
  if (parameter === undefined) {
    return false;
  }
  selectPage(page.id);
  updateCurrentSystem({
    params: {
      ...$currentSystem.get().params,
      [parameter.name]: getAssetDisplayNameParts(asset).basename,
    },
  });
  return true;
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
  const [error, setError] = useState<string>();
  const [creating, setCreating] = useState(false);

  useLayoutEffect(() => {
    if (open) {
      setValues(
        createInitialValues(config.fields, collection.templateProperties)
      );
      setSlugEdited(false);
      setError(undefined);
      setCreating(false);
    }
  }, [collection.templateProperties, config.fields, open]);

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
      const projectId = $project.get()?.id;
      if (projectId === undefined) {
        throw new Error("Project not found");
      }
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
      const validationError = getCollectionFieldValidationError(
        config,
        submittedValues
      );
      if (validationError !== undefined) {
        throw new Error(validationError);
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
      executeRuntimeMutation({ id: "assets.add", input: { asset } });
      onNextTransactionComplete(invalidateAssets);
      onOpenChange(false);
      const previewOpened = openConfiguredPreview({ collection, asset });
      toast.success(
        previewOpened ? "Entry created and opened." : "Entry created."
      );
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
                  step={field.type === "integer" ? 1 : undefined}
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
