import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  getCollectionTemplateValidationError,
  parseCollectionConfig,
  serializeCollectionConfig,
  type CollectionField,
  type ContentCollectionConfig,
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
import {
  formatAssetName,
  findPageByIdOrPath,
  getAllPages,
  getPagePath,
  isMdxFileAsset,
} from "@webstudio-is/sdk";
import { $assets, $pages, $project } from "~/shared/sync/data-stores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";
import { invalidateAssets } from "~/shared/resources";
import { updateAssetContent } from "../assets/update-asset-content";
import {
  readBuilderAssetSource,
  type ContentCollection,
} from "../assets/content-collections";
import { isCollectionPreviewPath } from "./collection-preview-utils";

type EditableType =
  | "Text"
  | "Long text"
  | "Slug"
  | "Number"
  | "Whole number"
  | "Boolean";
type EditableCollectionField = CollectionField & { rowId: string };
const fieldTypes: readonly EditableType[] = [
  "Text",
  "Long text",
  "Slug",
  "Number",
  "Whole number",
  "Boolean",
];
const booleanDefaultOptions = [
  { value: "unset", label: "Not set" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
] as const;

const createEditableFields = (
  collectionFields: readonly CollectionField[]
): EditableCollectionField[] =>
  collectionFields.map((field) => ({
    ...field,
    rowId: `original:${field.originalKey ?? field.key}`,
  }));

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
  field: EditableCollectionField,
  type: EditableType
): EditableCollectionField => {
  const shared = {
    rowId: field.rowId,
    key: field.key,
    originalKey: field.originalKey,
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
    return {
      ...shared,
      ...(field.type === "string"
        ? {
            minLength: field.minLength,
            maxLength: field.maxLength,
            defaultValue: field.defaultValue,
          }
        : {}),
      type: "string",
      control: "slug",
    };
  }
  return {
    ...shared,
    ...(field.type === "string"
      ? {
          minLength: field.minLength,
          maxLength: field.maxLength,
          defaultValue: field.defaultValue,
        }
      : {}),
    type: "string",
    control: type === "Long text" ? "textarea" : "text",
  };
};

const optionalNumber = (value: string) =>
  value.trim() === "" || Number.isFinite(Number(value)) === false
    ? undefined
    : Number(value);

const getUniqueFieldKey = (fields: readonly EditableCollectionField[]) => {
  const keys = new Set(
    fields.flatMap(({ key, originalKey }) =>
      originalKey === undefined ? [key] : [key, originalKey]
    )
  );
  for (let index = 1; ; index += 1) {
    const key = `field${index}`;
    if (keys.has(key) === false) {
      return key;
    }
  }
};

export const getCollectionSettingsSaveOrder = ({
  currentConfig,
  currentTemplateProperties,
  nextConfig,
  nextTemplateProperties,
}: {
  currentConfig: ContentCollectionConfig;
  currentTemplateProperties: Readonly<Record<string, unknown>>;
  nextConfig: ContentCollectionConfig;
  nextTemplateProperties: Readonly<Record<string, unknown>>;
}) => {
  if (
    getCollectionTemplateValidationError(
      nextConfig,
      currentTemplateProperties
    ) === undefined
  ) {
    return "config-first" as const;
  }
  if (
    getCollectionTemplateValidationError(
      currentConfig,
      nextTemplateProperties
    ) === undefined
  ) {
    return "template-first" as const;
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
  const nextRowId = useRef(0);
  const [fields, setFields] = useState<EditableCollectionField[]>(() =>
    createEditableFields(collection.config.fields)
  );
  const [template, setTemplate] = useState("");
  const [loadedTemplateKey, setLoadedTemplateKey] = useState<string>();
  const [slugField, setSlugField] = useState(collection.config.slugField);
  const [generateSlugFrom, setGenerateSlugFrom] = useState(
    collection.config.generateSlugFrom
  );
  const [previewPage, setPreviewPage] = useState(collection.config.previewPage);
  const [previewNotice, setPreviewNotice] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const pages = useStore($pages);
  const assets = useStore($assets);
  const hasEntries = Array.from(assets.values()).some(
    (asset) =>
      asset.folderId === collection.folderId &&
      asset.id !== collection.templateAsset.id &&
      isMdxFileAsset(asset)
  );
  const templateKey = `${collection.templateAsset.id}:${
    collection.templateAsset.name
  }:${collection.templateAsset.updatedAt ?? collection.templateAsset.size}`;
  const templateReady = loadedTemplateKey === templateKey;
  const formDisabled = loading || saving;
  const previewPages = useMemo(
    () =>
      pages === undefined
        ? []
        : getAllPages(pages).flatMap((page) => {
            const path = getPagePath(page.id, pages);
            return isCollectionPreviewPath(path, slugField)
              ? [{ id: page.id, name: page.name, path }]
              : [];
          }),
    [pages, slugField]
  );

  useLayoutEffect(() => {
    if (open === false) {
      return;
    }
    setFields(createEditableFields(collection.config.fields));
    setSlugField(collection.config.slugField);
    setGenerateSlugFrom(collection.config.generateSlugFrom);
    setPreviewPage(collection.config.previewPage);
    setPreviewNotice(undefined);
    setError(undefined);
    setConfirmRemove(false);
  }, [collection, open]);

  useLayoutEffect(() => {
    if (previewPage === undefined || pages === undefined) {
      return;
    }
    const page = findPageByIdOrPath(previewPage, pages);
    if (
      page === undefined ||
      isCollectionPreviewPath(getPagePath(page.id, pages), slugField) === false
    ) {
      setPreviewPage(undefined);
      setPreviewNotice(
        "The saved preview page is missing or no longer matches the slug field. Choose another page."
      );
    }
  }, [pages, previewPage, slugField]);

  useLayoutEffect(() => {
    if (open === false) {
      return;
    }
    setTemplate("");
    setLoadedTemplateKey(undefined);
    const projectId = $project.get()?.id;
    if (projectId === undefined) {
      setLoading(false);
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
          setLoadedTemplateKey(templateKey);
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
  }, [collection.templateAsset.id, open, templateKey]);

  const updateField = (index: number, field: EditableCollectionField) =>
    setFields((current) =>
      current.map((candidate, fieldIndex) =>
        fieldIndex === index ? field : candidate
      )
    );

  const save = async () => {
    if (saving || loading || templateReady === false) {
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
      const nextFields = fields.map((field, index) => {
        const { rowId, ...collectionField } = field;
        void rowId;
        return { ...collectionField, key: keys[index] };
      });
      const normalizeLinkedFieldKey = (linkedKey: string) => {
        const fieldIndex = fields.findIndex(({ key }) => key === linkedKey);
        return fieldIndex === -1 ? linkedKey.trim() : keys[fieldIndex];
      };
      const nextSlugField = normalizeLinkedFieldKey(slugField);
      const nextGenerateSlugFrom = normalizeLinkedFieldKey(generateSlugFrom);
      const originalFields = new Map(
        collection.config.fields.map((field) => [field.key, field])
      );
      const removesExistingField = collection.config.fields.some(
        ({ key }) =>
          nextFields.some(({ originalKey }) => originalKey === key) === false
      );
      const changesExistingFieldIdentity = nextFields.some(
        ({ key, originalKey, type }) => {
          if (originalKey === undefined) {
            return false;
          }
          const original = originalFields.get(originalKey);
          return (
            original === undefined ||
            key !== originalKey ||
            type !== original.type
          );
        }
      );
      if (
        hasEntries &&
        (nextSlugField !== collection.config.slugField ||
          removesExistingField ||
          changesExistingFieldIdentity)
      ) {
        throw new Error(
          "Slug fields and existing field keys or types cannot change after entries have been created."
        );
      }
      const configSource = serializeCollectionConfig({
        config: collection.config,
        fields: nextFields,
        settings: {
          template: formatAssetName(collection.templateAsset),
          slugField: nextSlugField,
          generateSlugFrom: nextGenerateSlugFrom,
          previewPage,
        },
      });
      const nextConfig = parseCollectionConfig(configSource);
      const templateDocument = await parseMdxDocument({ source: template });
      const templateValidationError = getCollectionTemplateValidationError(
        nextConfig,
        templateDocument.frontmatter.properties
      );
      if (templateValidationError !== undefined) {
        throw new Error(`Entry template: ${templateValidationError}`);
      }
      const defaultValidationError = getCollectionTemplateValidationError(
        nextConfig,
        Object.fromEntries(
          nextFields.flatMap((field) =>
            field.defaultValue === undefined
              ? []
              : [[field.key, field.defaultValue]]
          )
        )
      );
      if (defaultValidationError !== undefined) {
        throw new Error(`Field default: ${defaultValidationError}`);
      }
      const saveOrder = getCollectionSettingsSaveOrder({
        currentConfig: collection.config,
        currentTemplateProperties: collection.templateProperties,
        nextConfig,
        nextTemplateProperties: templateDocument.frontmatter.properties,
      });
      if (saveOrder === undefined) {
        throw new Error(
          "This field type and its template default cannot change together. Remove the template default, save, then change the field type."
        );
      }
      const updates =
        saveOrder === "config-first"
          ? [
              { asset: collection.configAsset, content: configSource },
              { asset: collection.templateAsset, content: template },
            ]
          : [
              { asset: collection.templateAsset, content: template },
              { asset: collection.configAsset, content: configSource },
            ];
      for (const update of updates) {
        await updateAssetContent(update);
      }
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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (formDisabled === false) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent
        css={{ width: "min(720px, calc(100vw - 32px))" }}
        aria-describedby={undefined}
      >
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
            <Text variant="labels">Collection behavior</Text>
            <Flex gap={2} wrap="wrap">
              <Grid gap={1} css={{ flexGrow: 1, minWidth: 180 }}>
                <Label htmlFor="collection-template-file">
                  Entry template file
                </Label>
                <InputField
                  id="collection-template-file"
                  aria-label="Entry template file"
                  value={formatAssetName(collection.templateAsset)}
                  readOnly
                />
              </Grid>
              <Grid gap={1} css={{ flexGrow: 1, minWidth: 180 }}>
                <Label>Slug field</Label>
                <Select
                  aria-label="Slug field"
                  options={fields.filter(({ type }) => type === "string")}
                  value={fields.find(({ key }) => key === slugField)}
                  getValue={({ key }) => key}
                  getLabel={({ label, key }) => `${label} (${key})`}
                  disabled={formDisabled || hasEntries}
                  onChange={({ key }) => {
                    setSlugField(key);
                    setFields((current) =>
                      current.map((field) => {
                        if (field.key === key) {
                          return {
                            ...setFieldType(field, "Slug"),
                            required: true,
                          };
                        }
                        if (field.control === "slug") {
                          return setFieldType(field, "Text");
                        }
                        return field;
                      })
                    );
                  }}
                />
              </Grid>
              <Grid gap={1} css={{ flexGrow: 1, minWidth: 180 }}>
                <Label>Generate slug from</Label>
                <Select
                  aria-label="Generate slug from"
                  options={fields.filter(({ type }) => type === "string")}
                  value={fields.find(({ key }) => key === generateSlugFrom)}
                  getValue={({ key }) => key}
                  getLabel={({ label, key }) => `${label} (${key})`}
                  disabled={formDisabled}
                  onChange={({ key }) => setGenerateSlugFrom(key)}
                />
              </Grid>
            </Flex>
            <Text color="subtle" variant="tiny">
              The template seeds each entry. The slug field becomes the MDX
              filename, and can be generated from another text field.
            </Text>
            {hasEntries && (
              <Text color="subtle" variant="tiny">
                The slug field and existing field keys and types are fixed after
                the first entry because changing them would require migrating
                every entry.
              </Text>
            )}
          </Grid>
          <Grid gap={2}>
            <Text variant="labels">Frontmatter fields</Text>
            {fields.map((field, index) => {
              const protectedField =
                field.key === slugField || field.key === generateSlugFrom;
              const requiredField = field.key === slugField;
              const stringField = field.type === "string";
              const numberField =
                field.type === "number" || field.type === "integer";
              return (
                <Grid
                  key={field.rowId}
                  gap={2}
                  css={{
                    padding: theme.spacing[3],
                    border: `1px solid ${cssVar("--border-default")}`,
                    borderRadius: theme.borderRadius[4],
                  }}
                >
                  <Flex gap={2} align="end" wrap="wrap">
                    <Grid gap={1} css={{ flexGrow: 1 }}>
                      <Label>Label</Label>
                      <InputField
                        aria-label={`${field.label} label`}
                        value={field.label}
                        disabled={formDisabled}
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
                        disabled={
                          formDisabled ||
                          (hasEntries && field.originalKey !== undefined)
                        }
                        onChange={(event) => {
                          const nextKey = event.target.value;
                          if (slugField === field.key) {
                            setSlugField(nextKey);
                          }
                          if (generateSlugFrom === field.key) {
                            setGenerateSlugFrom(nextKey);
                          }
                          updateField(index, {
                            ...field,
                            key: nextKey,
                          });
                        }}
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
                        disabled={
                          formDisabled ||
                          protectedField ||
                          (hasEntries && field.originalKey !== undefined)
                        }
                        onChange={(type) => {
                          const editableType = type as EditableType;
                          if (editableType === "Slug") {
                            setSlugField(field.key);
                            setFields((current) =>
                              current.map((candidate, fieldIndex) => {
                                if (fieldIndex === index) {
                                  return {
                                    ...setFieldType(candidate, "Slug"),
                                    required: true,
                                  };
                                }
                                if (candidate.control === "slug") {
                                  return setFieldType(candidate, "Text");
                                }
                                return candidate;
                              })
                            );
                            return;
                          }
                          updateField(index, setFieldType(field, editableType));
                        }}
                      />
                    </Grid>
                    <SmallIconButton
                      aria-label={`Remove ${field.label}`}
                      disabled={
                        formDisabled ||
                        protectedField ||
                        (hasEntries && field.originalKey !== undefined)
                      }
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
                  <Flex gap={3} align="end" wrap="wrap">
                    <CheckboxAndLabel>
                      <Checkbox
                        aria-label={`${field.label} required`}
                        checked={field.required}
                        disabled={formDisabled || requiredField}
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
                            aria-label={`${field.label} ${
                              stringField ? "minimum length" : "minimum"
                            }`}
                            type="number"
                            min={stringField ? 0 : undefined}
                            value={String(
                              stringField
                                ? (field.minLength ?? "")
                                : (field.minimum ?? "")
                            )}
                            disabled={formDisabled}
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
                            aria-label={`${field.label} ${
                              stringField ? "maximum length" : "maximum"
                            }`}
                            type="number"
                            min={stringField ? 0 : undefined}
                            value={String(
                              stringField
                                ? (field.maxLength ?? "")
                                : (field.maximum ?? "")
                            )}
                            disabled={formDisabled}
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
                    <Grid gap={1} css={{ flexGrow: 1, minWidth: 120 }}>
                      <Label>Default</Label>
                      {field.type === "boolean" ? (
                        <Select
                          aria-label={`${field.label} default`}
                          options={booleanDefaultOptions}
                          value={booleanDefaultOptions.find(({ value }) =>
                            field.defaultValue === true
                              ? value === "true"
                              : field.defaultValue === false
                                ? value === "false"
                                : value === "unset"
                          )}
                          getValue={(
                            option: (typeof booleanDefaultOptions)[number]
                          ) => option.value}
                          getLabel={(
                            option: (typeof booleanDefaultOptions)[number]
                          ) => option.label}
                          disabled={formDisabled}
                          onChange={({ value }) =>
                            updateField(index, {
                              ...field,
                              defaultValue:
                                value === "unset"
                                  ? undefined
                                  : value === "true",
                            })
                          }
                        />
                      ) : (
                        <InputField
                          aria-label={`${field.label} default`}
                          type={numberField ? "number" : "text"}
                          step={field.type === "integer" ? 1 : undefined}
                          value={
                            field.defaultValue === undefined
                              ? ""
                              : String(field.defaultValue)
                          }
                          disabled={formDisabled}
                          onChange={(event) =>
                            updateField(index, {
                              ...field,
                              defaultValue: numberField
                                ? optionalNumber(event.target.value)
                                : event.target.value,
                            })
                          }
                        />
                      )}
                      {stringField && (
                        <Button
                          aria-label={`Unset ${field.label} default`}
                          disabled={
                            formDisabled || field.defaultValue === undefined
                          }
                          onClick={() =>
                            updateField(index, {
                              ...field,
                              defaultValue: undefined,
                            })
                          }
                        >
                          Unset
                        </Button>
                      )}
                    </Grid>
                  </Flex>
                </Grid>
              );
            })}
            <Button
              disabled={formDisabled}
              prefix={<PlusIcon />}
              onClick={() => {
                const key = getUniqueFieldKey(fields);
                const rowId = `new:${nextRowId.current}`;
                nextRowId.current += 1;
                setFields((current) => [
                  ...current,
                  {
                    key,
                    rowId,
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
                value={previewPages.find(
                  ({ id, path }) => id === previewPage || path === previewPage
                )}
                placeholder="Select a dynamic page"
                getValue={({ id }) => id}
                getLabel={({ name, path }) => `${name} (${path})`}
                disabled={formDisabled}
                onChange={({ path }) => {
                  setPreviewPage(path);
                  setPreviewNotice(undefined);
                }}
              />
              {previewPage !== undefined && (
                <Button
                  disabled={formDisabled}
                  onClick={() => {
                    setPreviewPage(undefined);
                    setPreviewNotice(undefined);
                  }}
                >
                  Clear
                </Button>
              )}
            </Flex>
            <Text color="subtle" variant="tiny">
              Preview pages need a dynamic “{slugField}” parameter. Any other
              parameters must be optional or catch-all.
            </Text>
            {previewNotice !== undefined && (
              <Text role="status" color="subtle" variant="tiny">
                {previewNotice}
              </Text>
            )}
          </Grid>
          <Grid gap={1}>
            <Label htmlFor="collection-entry-template">Entry template</Label>
            <TextArea
              id="collection-entry-template"
              variant="mono"
              rows={10}
              value={template}
              disabled={formDisabled || templateReady === false}
              onChange={setTemplate}
            />
          </Grid>
          {error !== undefined && (
            <Text role="alert" color="destructive" variant="tiny">
              {error}
            </Text>
          )}
          {confirmRemove && (
            <Text role="alert" variant="regular">
              Removing the collection keeps “
              {formatAssetName(collection.templateAsset)}” as a regular MDX
              file. It can then appear in asset queries.
            </Text>
          )}
          <Flex justify="between">
            <Button
              color="destructive"
              disabled={formDisabled}
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
              disabled={loading || saving || templateReady === false}
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
