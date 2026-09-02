import { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  parseCollectionConfig,
  serializeCollectionConfig,
  type CollectionField,
} from "@webstudio-is/content-engine";
import { parseMdxDocument } from "@webstudio-is/content-engine/mdx";
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
  Select,
  SmallIconButton,
  Text,
  TextArea,
  cssVar,
  theme,
} from "@webstudio-is/design-system";
import { PlusIcon, TrashIcon } from "@webstudio-is/icons";
import { getAllPages, getPagePath } from "@webstudio-is/sdk";
import { isPathnamePattern } from "@webstudio-is/project-build/runtime";
import { $pages, $project } from "~/shared/sync/data-stores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";
import { invalidateAssets } from "~/shared/resources";
import { updateAssetContent } from "../assets/update-asset-content";
import {
  readBuilderAssetSource,
  type ContentCollection,
} from "../assets/content-collections";

type EditableType =
  | "Text"
  | "Long text"
  | "Slug"
  | "Number"
  | "Whole number"
  | "Boolean";
const fieldTypes: readonly EditableType[] = [
  "Text",
  "Long text",
  "Number",
  "Whole number",
  "Boolean",
];

const getEditableType = (field: CollectionField): EditableType => {
  if (field.control === "slug") {
    return "Slug";
  }
  if (field.type === "boolean") {
    return "Boolean";
  }
  if (field.type === "integer") {
    return "Whole number";
  }
  if (field.type === "number") {
    return "Number";
  }
  return field.control === "textarea" ? "Long text" : "Text";
};

const setFieldType = (
  field: CollectionField,
  type: EditableType
): CollectionField => {
  const shared = {
    key: field.key,
    label: field.label,
    required: field.required,
  };
  if (type === "Boolean") {
    return { ...shared, type: "boolean", control: "checkbox" };
  }
  if (type === "Number" || type === "Whole number") {
    return {
      ...shared,
      type: type === "Number" ? "number" : "integer",
      control: "number",
    };
  }
  if (type === "Slug") {
    return { ...shared, type: "string", control: "slug" };
  }
  return {
    ...shared,
    type: "string",
    control: type === "Long text" ? "textarea" : "text",
  };
};

const optionalNumber = (value: string) =>
  value.trim() === "" || Number.isFinite(Number(value)) === false
    ? undefined
    : Number(value);

const getUniqueFieldKey = (fields: readonly CollectionField[]) => {
  const keys = new Set(fields.map(({ key }) => key));
  for (let index = 1; ; index += 1) {
    const key = `field${index}`;
    if (keys.has(key) === false) {
      return key;
    }
  }
};

export const CollectionSettingsDialog = ({
  collection,
  open,
  onOpenChange,
}: {
  collection: Extract<ContentCollection, { status: "ready" }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [fields, setFields] = useState<CollectionField[]>([
    ...collection.config.fields,
  ]);
  const [template, setTemplate] = useState("");
  const [previewPage, setPreviewPage] = useState(collection.config.previewPage);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const pages = useStore($pages);
  const previewPages = useMemo(
    () =>
      pages === undefined
        ? []
        : getAllPages(pages).flatMap((page) => {
            const path = getPagePath(page.id, pages);
            return isPathnamePattern(path)
              ? [{ id: page.id, name: page.name, path }]
              : [];
          }),
    [pages]
  );

  useEffect(() => {
    if (open === false) {
      return;
    }
    setFields([...collection.config.fields]);
    setPreviewPage(collection.config.previewPage);
    setError(undefined);
    setConfirmRemove(false);
    const projectId = $project.get()?.id;
    if (projectId === undefined) {
      setError("Project not found");
      return;
    }
    let cancelled = false;
    setLoading(true);
    void readBuilderAssetSource({
      projectId,
      assetId: collection.templateAsset.id,
    })
      .then((source) => {
        if (cancelled === false) {
          setTemplate(source);
        }
      })
      .catch((error) => {
        if (cancelled === false) {
          setError(
            error instanceof Error
              ? error.message
              : "Template could not be loaded"
          );
        }
      })
      .finally(() => {
        if (cancelled === false) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [collection, open]);

  const updateField = (index: number, field: CollectionField) =>
    setFields((current) =>
      current.map((candidate, fieldIndex) =>
        fieldIndex === index ? field : candidate
      )
    );

  const save = async () => {
    if (saving || loading) {
      return;
    }
    const keys = fields.map(({ key }) => key.trim());
    if (keys.some((key) => key === "") || new Set(keys).size !== keys.length) {
      setError("Every field needs a unique key.");
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const configSource = serializeCollectionConfig({
        config: collection.config,
        fields: fields.map((field, index) => ({
          ...field,
          key: keys[index],
        })),
        settings: { previewPage },
      });
      parseCollectionConfig(configSource);
      await parseMdxDocument({ source: template });
      await updateAssetContent({
        asset: collection.templateAsset,
        content: template,
      });
      await updateAssetContent({
        asset: collection.configAsset,
        content: configSource,
      });
      onOpenChange(false);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Collection settings could not be saved"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent minWidth={560} aria-describedby={undefined}>
        <DialogTitle>Collection settings</DialogTitle>
        <Grid
          gap={4}
          css={{
            padding: theme.panel.padding,
            maxHeight: "70vh",
            overflow: "auto",
          }}
        >
          <Grid gap={2}>
            <Text variant="labels">Frontmatter fields</Text>
            {fields.map((field, index) => {
              const protectedField =
                field.key === collection.config.slugField ||
                field.key === collection.config.generateSlugFrom;
              const stringField = field.type === "string";
              const numberField =
                field.type === "number" || field.type === "integer";
              return (
                <Grid
                  key={`${field.key}-${index}`}
                  gap={2}
                  css={{
                    padding: theme.spacing[3],
                    border: `1px solid ${cssVar("--border-default")}`,
                    borderRadius: theme.borderRadius[4],
                  }}
                >
                  <Flex gap={2} align="end">
                    <Grid gap={1} css={{ flexGrow: 1 }}>
                      <Label>Label</Label>
                      <InputField
                        aria-label={`${field.label} label`}
                        value={field.label}
                        onChange={(event) =>
                          updateField(index, {
                            ...field,
                            label: event.target.value,
                          })
                        }
                      />
                    </Grid>
                    <Grid gap={1} css={{ flexGrow: 1 }}>
                      <Label>Key</Label>
                      <InputField
                        aria-label={`${field.label} key`}
                        value={field.key}
                        disabled={protectedField}
                        onChange={(event) =>
                          updateField(index, {
                            ...field,
                            key: event.target.value,
                          })
                        }
                      />
                    </Grid>
                    <Grid gap={1} css={{ flexGrow: 1 }}>
                      <Label>Type</Label>
                      <Select
                        aria-label={`${field.label} type`}
                        options={
                          field.control === "slug" ? ["Slug"] : fieldTypes
                        }
                        value={getEditableType(field)}
                        disabled={field.control === "slug"}
                        onChange={(type) =>
                          updateField(
                            index,
                            setFieldType(field, type as EditableType)
                          )
                        }
                      />
                    </Grid>
                    <SmallIconButton
                      aria-label={`Remove ${field.label}`}
                      disabled={protectedField}
                      icon={<TrashIcon />}
                      onClick={() =>
                        setFields((current) =>
                          current.filter(
                            (_, fieldIndex) => fieldIndex !== index
                          )
                        )
                      }
                    />
                  </Flex>
                  <Flex gap={3} align="end">
                    <CheckboxAndLabel>
                      <Checkbox
                        aria-label={`${field.label} required`}
                        checked={field.required}
                        disabled={protectedField}
                        onCheckedChange={(checked) =>
                          updateField(index, {
                            ...field,
                            required: checked === true,
                          })
                        }
                      />
                      <Text>Required</Text>
                    </CheckboxAndLabel>
                    {(stringField || numberField) && (
                      <>
                        <Grid gap={1} css={{ flexGrow: 1 }}>
                          <Label>
                            {stringField ? "Minimum length" : "Minimum"}
                          </Label>
                          <InputField
                            aria-label={`${field.label} ${stringField ? "minimum length" : "minimum"}`}
                            type="number"
                            min={stringField ? 0 : undefined}
                            value={String(
                              stringField
                                ? (field.minLength ?? "")
                                : (field.minimum ?? "")
                            )}
                            onChange={(event) =>
                              updateField(index, {
                                ...field,
                                ...(stringField
                                  ? {
                                      minLength: optionalNumber(
                                        event.target.value
                                      ),
                                    }
                                  : {
                                      minimum: optionalNumber(
                                        event.target.value
                                      ),
                                    }),
                              })
                            }
                          />
                        </Grid>
                        <Grid gap={1} css={{ flexGrow: 1 }}>
                          <Label>
                            {stringField ? "Maximum length" : "Maximum"}
                          </Label>
                          <InputField
                            aria-label={`${field.label} ${stringField ? "maximum length" : "maximum"}`}
                            type="number"
                            min={stringField ? 0 : undefined}
                            value={String(
                              stringField
                                ? (field.maxLength ?? "")
                                : (field.maximum ?? "")
                            )}
                            onChange={(event) =>
                              updateField(index, {
                                ...field,
                                ...(stringField
                                  ? {
                                      maxLength: optionalNumber(
                                        event.target.value
                                      ),
                                    }
                                  : {
                                      maximum: optionalNumber(
                                        event.target.value
                                      ),
                                    }),
                              })
                            }
                          />
                        </Grid>
                      </>
                    )}
                  </Flex>
                </Grid>
              );
            })}
            <Button
              prefix={<PlusIcon />}
              onClick={() => {
                const key = getUniqueFieldKey(fields);
                setFields((current) => [
                  ...current,
                  {
                    key,
                    label: "New field",
                    type: "string",
                    control: "text",
                    required: false,
                  },
                ]);
              }}
            >
              Add field
            </Button>
          </Grid>
          <Grid gap={1}>
            <Label>Dynamic preview page</Label>
            <Flex gap={2}>
              <Select
                aria-label="Dynamic preview page"
                options={previewPages}
                value={previewPages.find(({ id }) => id === previewPage)}
                placeholder="Select a dynamic page"
                getValue={({ id }) => id}
                getLabel={({ name, path }) => `${name} (${path})`}
                onChange={({ id }) => setPreviewPage(id)}
              />
              {previewPage !== undefined && (
                <Button onClick={() => setPreviewPage(undefined)}>Clear</Button>
              )}
            </Flex>
            <Text color="subtle" variant="tiny">
              New entries open here using the first dynamic path parameter.
            </Text>
          </Grid>
          <Grid gap={1}>
            <Label htmlFor="collection-entry-template">Entry template</Label>
            <TextArea
              id="collection-entry-template"
              variant="mono"
              rows={10}
              value={template}
              disabled={loading}
              onChange={setTemplate}
            />
          </Grid>
          {error !== undefined && (
            <Text color="destructive" variant="tiny">
              {error}
            </Text>
          )}
          <Flex justify="between">
            <Button
              color="destructive"
              onClick={() => {
                if (confirmRemove === false) {
                  setConfirmRemove(true);
                  return;
                }
                executeRuntimeMutation({
                  id: "assets.delete",
                  input: {
                    assetIds: [collection.configAsset.id],
                    force: true,
                  },
                });
                onNextTransactionComplete(invalidateAssets);
                onOpenChange(false);
              }}
            >
              {confirmRemove ? "Confirm removal" : "Remove collection"}
            </Button>
            <Button
              color="primary"
              disabled={loading || saving}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </Flex>
        </Grid>
      </DialogContent>
    </Dialog>
  );
};
