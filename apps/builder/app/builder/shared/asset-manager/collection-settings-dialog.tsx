import { useLayoutEffect, useMemo, useRef, useState } from "react";
import isValidFilename from "valid-filename";
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
  List,
  ListItem,
  rawTheme,
  ScrollAreaNative,
  Select,
  Separator,
  SmallIconButton,
  Text,
  cssVar,
  selectedItemBackground,
  theme,
} from "@webstudio-is/design-system";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
} from "@webstudio-is/icons";
import {
  formatAssetName,
  findPageByIdOrPath,
  getAssetDisplayNameParts,
  getAllPages,
  getPagePath,
  isMdxFileAsset,
} from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import { $assets, $pages, $project } from "~/shared/sync/data-stores";
import {
  executeRuntimeMutation,
  getWebstudioData,
} from "~/shared/instance-utils/data";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";
import { createTransactionFromBuilderPatchPayload } from "~/shared/sync/builder-patch";
import { invalidateAssets } from "~/shared/resources";
import { fetch } from "~/shared/fetch.client";
import { updateAssetContent as updateBuilderAssetContent } from "../assets/update-asset-content";
import { isAssetFilenameUsed } from "../assets/asset-utils";
import {
  readBuilderAssetSource,
  type ContentCollection,
} from "../assets/content-collections";
import { isCollectionPreviewPath } from "./collection-preview-utils";
import { MarkdownEditor } from "~/builder/features/text-file-editor/text-file-editor";
import { getTextFileEditorExtensions } from "~/builder/features/text-file-editor/text-file-utils";

type EditableType =
  | "Text"
  | "Long text"
  | "Slug"
  | "Number"
  | "Whole number"
  | "Boolean";
type EditableCollectionField = CollectionField & { rowId: string };
type SettingsSection = "fields" | "template" | "settings";
const settingsSections: readonly {
  id: SettingsSection;
  label: string;
}[] = [
  { id: "fields", label: "Fields" },
  { id: "template", label: "Template" },
  { id: "settings", label: "Settings" },
];
const fieldTypes: readonly EditableType[] = [
  "Text",
  "Long text",
  "Slug",
  "Number",
  "Whole number",
  "Boolean",
];
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

export const updateCollectionConfigAndTemplateName = async ({
  projectId,
  collection,
  templateFilename,
  configSource,
  request = fetch,
}: {
  projectId: string;
  collection: Extract<ContentCollection, { status: "ready" }>;
  templateFilename: string;
  configSource: string;
  request?: typeof fetch;
}) => {
  const response = await request(
    `/rest/assets/folders/${encodeURIComponent(
      collection.folderId
    )}/collection-settings?projectId=${encodeURIComponent(projectId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        configAssetId: collection.configAsset.id,
        expectedConfigName: collection.configAsset.name,
        templateAssetId: collection.templateAsset.id,
        expectedTemplateFilename: collection.templateAsset.filename ?? null,
        templateFilename,
        configSource,
      }),
    }
  );
  const payload = (await response.json()) as
    | {
        configAsset: typeof collection.configAsset;
        templateAsset: typeof collection.templateAsset;
      }
    | { errors?: string };
  if (response.ok === false || "configAsset" in payload === false) {
    throw new Error(
      "errors" in payload && typeof payload.errors === "string"
        ? payload.errors
        : "Collection settings could not be saved"
    );
  }
  if ($project.get()?.id !== projectId) {
    throw new Error(
      "Collection settings were updated in the previous project. Return to that project to view them."
    );
  }
  createTransactionFromBuilderPatchPayload({
    data: getWebstudioData(),
    payload: [
      {
        namespace: "assets",
        patches: [
          {
            op: "replace",
            path: [payload.configAsset.id],
            value: payload.configAsset,
          },
          {
            op: "replace",
            path: [payload.templateAsset.id],
            value: payload.templateAsset,
          },
        ],
      },
    ],
  });
  onNextTransactionComplete(invalidateAssets);
  return payload;
};

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
  readTemplateSource = readBuilderAssetSource,
  updateContent = updateBuilderAssetContent,
  updateConfigAndTemplateName = updateCollectionConfigAndTemplateName,
}: {
  collection: Extract<ContentCollection, { status: "ready" }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readTemplateSource?: typeof readBuilderAssetSource;
  updateContent?: typeof updateBuilderAssetContent;
  updateConfigAndTemplateName?: typeof updateCollectionConfigAndTemplateName;
}) => {
  const nextRowId = useRef(0);
  const [fields, setFields] = useState<EditableCollectionField[]>(() =>
    createEditableFields(collection.config.fields)
  );
  const [selectedFieldRowId, setSelectedFieldRowId] = useState<
    string | undefined
  >(() => createEditableFields(collection.config.fields)[0]?.rowId);
  const [activeSection, setActiveSection] = useState<SettingsSection>("fields");
  const [template, setTemplate] = useState("");
  const loadedTemplateRef = useRef("");
  const [templateName, setTemplateName] = useState(
    () => getAssetDisplayNameParts(collection.templateAsset).basename
  );
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
  const templateLanguageExtensions = useMemo(
    () => getTextFileEditorExtensions(collection.templateAsset),
    [collection.templateAsset]
  );

  useLayoutEffect(() => {
    if (open === false) {
      return;
    }
    const nextFields = createEditableFields(collection.config.fields);
    setFields(nextFields);
    setSelectedFieldRowId(nextFields[0]?.rowId);
    setActiveSection("fields");
    setTemplateName(
      getAssetDisplayNameParts(collection.templateAsset).basename
    );
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
    void readTemplateSource({
      projectId,
      assetId: collection.templateAsset.id,
    })
      .then((source) => {
        if (cancelled === false) {
          setTemplate(source);
          loadedTemplateRef.current = source;
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
  }, [collection.templateAsset.id, open, readTemplateSource, templateKey]);

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
      const nextTemplateName = templateName.trim();
      const nextTemplateFilename = formatAssetName({
        ...collection.templateAsset,
        filename: nextTemplateName,
      });
      if (
        nextTemplateName === "" ||
        isValidFilename(nextTemplateFilename) === false
      ) {
        throw new Error("Enter a valid template name.");
      }
      if (
        isAssetFilenameUsed({
          assets: assets.values(),
          filename: nextTemplateFilename,
          folderId: collection.folderId,
          excludeAssetId: collection.templateAsset.id,
        })
      ) {
        throw new Error("That template name is already used in this folder.");
      }
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
          template: nextTemplateFilename,
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
      const currentTemplateName = getAssetDisplayNameParts(
        collection.templateAsset
      ).basename;
      const renamesTemplate = nextTemplateName !== currentTemplateName;
      const projectId = $project.get()?.id;
      if (projectId === undefined) {
        throw new Error("Project not found");
      }
      const originalConfigSource = `${JSON.stringify(
        collection.config.schema,
        undefined,
        2
      )}\n`;
      let updatedTemplateAsset = collection.templateAsset;
      let updatedConfigAsset = collection.configAsset;
      if (saveOrder === "template-first") {
        updatedTemplateAsset = await updateContent({
          asset: collection.templateAsset,
          content: template,
        });
      }
      try {
        if (renamesTemplate) {
          const updated = await updateConfigAndTemplateName({
            projectId,
            collection,
            templateFilename: nextTemplateName,
            configSource,
          });
          updatedConfigAsset = updated.configAsset;
          updatedTemplateAsset = updated.templateAsset;
        } else {
          updatedConfigAsset = await updateContent({
            asset: collection.configAsset,
            content: configSource,
          });
        }
      } catch (error) {
        if (saveOrder === "template-first") {
          try {
            await updateContent({
              asset: updatedTemplateAsset,
              content: loadedTemplateRef.current,
            });
          } catch {
            throw new Error(
              "Collection settings failed and the entry template could not be restored",
              { cause: error }
            );
          }
        }
        throw error;
      }
      if (saveOrder === "config-first") {
        try {
          await updateContent({
            asset: updatedTemplateAsset,
            content: template,
          });
        } catch (error) {
          try {
            if (renamesTemplate) {
              await updateConfigAndTemplateName({
                projectId,
                collection: {
                  ...collection,
                  configAsset: updatedConfigAsset,
                  templateAsset: updatedTemplateAsset,
                  config: nextConfig,
                },
                templateFilename: currentTemplateName,
                configSource: originalConfigSource,
              });
            } else {
              await updateContent({
                asset: updatedConfigAsset,
                content: originalConfigSource,
              });
            }
          } catch {
            throw new Error(
              "The entry template failed to save and the collection configuration could not be restored",
              { cause: error }
            );
          }
          throw error;
        }
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
      <DialogContent width={880} height={640} aria-describedby={undefined}>
        <DialogTitle>Collection settings</DialogTitle>
        <Flex grow css={{ minHeight: 0 }}>
          <List asChild>
            <Flex
              direction="column"
              shrink={false}
              css={{
                width: rawTheme.spacing[26],
                borderRight: `1px solid ${cssVar("--border-default")}`,
              }}
            >
              {settingsSections.map(({ id, label }, index) => (
                <ListItem
                  current={activeSection === id}
                  asChild
                  index={index}
                  key={id}
                  onSelect={() => setActiveSection(id)}
                >
                  <Flex
                    align="center"
                    css={{
                      height: theme.spacing[13],
                      paddingInline: theme.panel.paddingInline,
                      outline: "none",
                      "&:focus-visible, &:hover": {
                        background: cssVar("--overlay-interaction-hover"),
                      },
                      "&[aria-current=true]": {
                        background: selectedItemBackground,
                        color: cssVar("--foreground-primary"),
                      },
                    }}
                  >
                    <Text variant="labels">{label}</Text>
                  </Flex>
                </ListItem>
              ))}
            </Flex>
          </List>
          <ScrollAreaNative css={{ width: "100%", minWidth: 0 }}>
            <Grid css={{ minHeight: "100%" }}>
              <Grid
                gap={3}
                css={{
                  display: activeSection === "fields" ? "grid" : "none",
                  minHeight: "100%",
                  alignContent: "start",
                }}
              >
                <Flex justify="between" align="start" gap={4}>
                  <Grid gap={1} css={{ padding: theme.spacing[5] }}>
                    <Text variant="titles">Fields</Text>
                    <Text color="subtle">
                      Define the information editors fill in for every entry.
                    </Text>
                    {hasEntries && (
                      <Text color="subtle" variant="tiny">
                        Existing field keys and types are fixed after the first
                        entry.
                      </Text>
                    )}
                  </Grid>
                  <Button
                    css={{ margin: theme.spacing[5] }}
                    disabled={formDisabled}
                    prefix={<PlusIcon />}
                    onClick={() => {
                      const key = getUniqueFieldKey(fields);
                      const rowId = `new:${nextRowId.current}`;
                      nextRowId.current += 1;
                      setSelectedFieldRowId(rowId);
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
                </Flex>
                <Grid
                  css={{
                    borderTop: `1px solid ${cssVar("--border-default")}`,
                  }}
                >
                  {fields.map((field, index) => {
                    const protectedField =
                      field.key === slugField || field.key === generateSlugFrom;
                    const requiredField = field.key === slugField;
                    const stringField = field.type === "string";
                    const numberField =
                      field.type === "number" || field.type === "integer";
                    const expanded = field.rowId === selectedFieldRowId;
                    return (
                      <Grid
                        key={field.rowId}
                        css={{
                          borderBottom: `1px solid ${cssVar(
                            "--border-default"
                          )}`,
                        }}
                      >
                        <Button
                          color="ghost"
                          aria-label={`Edit ${field.label}`}
                          aria-expanded={expanded}
                          css={{
                            height: "auto",
                            minHeight: theme.spacing[15],
                            justifyContent: "stretch",
                            paddingInline: theme.spacing[5],
                            whiteSpace: "normal",
                            ...(expanded
                              ? {
                                  background: selectedItemBackground,
                                }
                              : {}),
                          }}
                          onClick={() =>
                            setSelectedFieldRowId(
                              expanded ? undefined : field.rowId
                            )
                          }
                        >
                          <Grid
                            align="center"
                            gap={3}
                            css={{
                              width: "100%",
                              gridTemplateColumns:
                                "16px minmax(0, 1fr) 120px 72px",
                              textAlign: "left",
                            }}
                          >
                            {expanded ? (
                              <ChevronDownIcon />
                            ) : (
                              <ChevronRightIcon />
                            )}
                            <Grid>
                              <Text variant="labels">{field.label}</Text>
                              <Text variant="tiny" color="subtle">
                                {field.key}
                              </Text>
                            </Grid>
                            <Text color="subtle">{getEditableType(field)}</Text>
                            <Text color="subtle">
                              {field.required ? "Required" : "Optional"}
                            </Text>
                          </Grid>
                        </Button>
                        {expanded && (
                          <Grid
                            gap={4}
                            css={{
                              padding: theme.spacing[5],
                              background: cssVar("--background-secondary"),
                            }}
                          >
                            <Grid
                              gap={3}
                              css={{
                                gridTemplateColumns:
                                  "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) auto",
                                alignItems: "end",
                              }}
                            >
                              <Grid gap={1}>
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
                              <Grid gap={1}>
                                <Label>Frontmatter key</Label>
                                <InputField
                                  aria-label={`${field.label} key`}
                                  value={field.key}
                                  disabled={
                                    formDisabled ||
                                    (hasEntries &&
                                      field.originalKey !== undefined)
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
                              <Grid gap={1}>
                                <Label>Type</Label>
                                <Select
                                  aria-label={`${field.label} type`}
                                  options={
                                    field.control === "slug"
                                      ? ["Slug"]
                                      : fieldTypes
                                  }
                                  value={getEditableType(field)}
                                  disabled={
                                    formDisabled ||
                                    protectedField ||
                                    (hasEntries &&
                                      field.originalKey !== undefined)
                                  }
                                  onChange={(type) => {
                                    const editableType = type as EditableType;
                                    if (editableType === "Slug") {
                                      setSlugField(field.key);
                                      setFields((current) =>
                                        current.map((candidate, fieldIndex) => {
                                          if (fieldIndex === index) {
                                            return {
                                              ...setFieldType(
                                                candidate,
                                                "Slug"
                                              ),
                                              required: true,
                                            };
                                          }
                                          if (candidate.control === "slug") {
                                            return setFieldType(
                                              candidate,
                                              "Text"
                                            );
                                          }
                                          return candidate;
                                        })
                                      );
                                      return;
                                    }
                                    updateField(
                                      index,
                                      setFieldType(field, editableType)
                                    );
                                  }}
                                />
                              </Grid>
                              <SmallIconButton
                                aria-label={`Remove ${field.label}`}
                                disabled={
                                  formDisabled ||
                                  protectedField ||
                                  (hasEntries &&
                                    field.originalKey !== undefined)
                                }
                                icon={<TrashIcon />}
                                onClick={() => {
                                  setSelectedFieldRowId(
                                    fields[index + 1]?.rowId ??
                                      fields[index - 1]?.rowId
                                  );
                                  setFields((current) =>
                                    current.filter(
                                      (_, fieldIndex) => fieldIndex !== index
                                    )
                                  );
                                }}
                              />
                            </Grid>
                            <Grid
                              gap={3}
                              css={{
                                gridTemplateColumns:
                                  stringField || numberField
                                    ? "minmax(120px, 1fr) minmax(0, 1fr) minmax(0, 1fr)"
                                    : "minmax(120px, 1fr)",
                              }}
                            >
                              <Grid gap={1}>
                                <Label>Requirement</Label>
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
                              </Grid>
                              {(stringField || numberField) && (
                                <>
                                  <Grid gap={1}>
                                    <Label>
                                      {stringField
                                        ? "Minimum length"
                                        : "Minimum"}
                                    </Label>
                                    <InputField
                                      aria-label={`${field.label} ${
                                        stringField
                                          ? "minimum length"
                                          : "minimum"
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
                                  <Grid gap={1}>
                                    <Label>
                                      {stringField
                                        ? "Maximum length"
                                        : "Maximum"}
                                    </Label>
                                    <InputField
                                      aria-label={`${field.label} ${
                                        stringField
                                          ? "maximum length"
                                          : "maximum"
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
                            </Grid>
                            {field.control === "slug" && (
                              <Grid gap={1} css={{ maxWidth: 320 }}>
                                <Label>Generate from</Label>
                                <Select
                                  aria-label="Generate slug from"
                                  options={fields.filter(
                                    (candidate) =>
                                      candidate.type === "string" &&
                                      candidate.key !== field.key
                                  )}
                                  value={fields.find(
                                    ({ key }) => key === generateSlugFrom
                                  )}
                                  getValue={({ key }) => key}
                                  getLabel={({ label, key }) =>
                                    `${label} (${key})`
                                  }
                                  disabled={formDisabled}
                                  onChange={({ key }) =>
                                    setGenerateSlugFrom(key)
                                  }
                                />
                                <Text color="subtle" variant="tiny">
                                  The slug becomes the MDX filename. It is
                                  generated from this field when editors create
                                  an entry.
                                </Text>
                              </Grid>
                            )}
                          </Grid>
                        )}
                      </Grid>
                    );
                  })}
                </Grid>
              </Grid>
              <Grid
                gap={4}
                css={{
                  display: activeSection === "settings" ? "grid" : "none",
                  padding: theme.spacing[5],
                  alignContent: "start",
                  maxWidth: 560,
                }}
              >
                <Grid gap={1}>
                  <Text variant="titles">Entry preview</Text>
                  <Text color="subtle">
                    Choose the page editors use to preview collection entries.
                  </Text>
                </Grid>
                <Grid gap={1}>
                  <Label>Dynamic preview page</Label>
                  <Flex gap={2}>
                    <Select
                      aria-label="Dynamic preview page"
                      options={previewPages}
                      value={previewPages.find(
                        ({ id, path }) =>
                          id === previewPage || path === previewPage
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
                    Preview pages need a dynamic “{slugField}” parameter. Any
                    other parameters must be optional or catch-all.
                  </Text>
                  {previewNotice !== undefined && (
                    <Text role="status" color="subtle" variant="tiny">
                      {previewNotice}
                    </Text>
                  )}
                </Grid>
                <Separator />
                <Grid gap={2}>
                  <Grid gap={1}>
                    <Text variant="titles">Remove collection</Text>
                    <Text color="subtle">
                      Turn this back into a regular folder. Existing MDX files
                      and the template are kept.
                    </Text>
                  </Grid>
                  {confirmRemove && (
                    <Text role="alert">
                      The collection rules will be removed. This cannot be
                      undone from this dialog.
                    </Text>
                  )}
                  <Flex>
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
                  </Flex>
                </Grid>
              </Grid>
              <Grid
                data-floating-panel-container
                css={{
                  display: activeSection === "template" ? "grid" : "none",
                  gridTemplateRows: "auto auto minmax(320px, 1fr)",
                  gap: theme.spacing[3],
                  minHeight: "100%",
                  padding: theme.spacing[5],
                }}
              >
                <Grid gap={1}>
                  <Text variant="titles">Entry template</Text>
                  <Text color="subtle">
                    Set the frontmatter defaults and starter Markdown copied
                    into every new entry.
                  </Text>
                </Grid>
                <Grid gap={1} css={{ maxWidth: 320 }}>
                  <Label htmlFor="collection-template-name">
                    Template name
                  </Label>
                  <InputField
                    id="collection-template-name"
                    aria-label="Entry template name"
                    value={templateName}
                    maxLength={assetResourceLimits.assetFilenameCharacters}
                    suffix=".mdx"
                    disabled={formDisabled}
                    onChange={(event) => setTemplateName(event.target.value)}
                  />
                </Grid>
                <MarkdownEditor
                  asset={{
                    ...collection.templateAsset,
                    filename: templateName,
                  }}
                  ariaLabel="Entry template Markdown"
                  value={template}
                  readOnly={formDisabled || templateReady === false}
                  languageExtensions={templateLanguageExtensions}
                  onChange={setTemplate}
                  onChangeComplete={setTemplate}
                />
              </Grid>
            </Grid>
          </ScrollAreaNative>
        </Flex>
        <Separator />
        <Flex
          justify="between"
          align="center"
          gap={3}
          css={{ padding: theme.panel.padding }}
        >
          <Flex grow align="center">
            {error !== undefined && (
              <Text role="alert" color="destructive" variant="tiny">
                {error}
              </Text>
            )}
          </Flex>
          <Flex gap={2}>
            <Button disabled={formDisabled} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              color="primary"
              disabled={loading || saving || templateReady === false}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </Flex>
        </Flex>
      </DialogContent>
    </Dialog>
  );
};
