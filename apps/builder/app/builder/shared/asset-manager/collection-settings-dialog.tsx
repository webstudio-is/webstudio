import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import isValidFilename from "valid-filename";
import { useStore } from "@nanostores/react";
import {
  getCollectionTemplateValidationError,
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
  DialogDescription,
  DialogTitle,
  DialogTitleActions,
  DialogClose,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  SmallIconButton,
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
  Text,
  Tooltip,
  cssVar,
  selectedItemBackground,
  theme,
} from "@webstudio-is/design-system";
import {
  EllipsesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  InfoCircleIcon,
  PlusIcon,
  TrashIcon,
} from "@webstudio-is/icons";
import { formatAssetName, getAssetDisplayNameParts } from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import { $assets, $project } from "~/shared/sync/data-stores";
import {
  executeRuntimeMutationAsync,
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
type SettingsSection = "fields" | "template";
const settingsSections: readonly {
  id: SettingsSection;
  label: string;
}[] = [
  { id: "fields", label: "Fields" },
  { id: "template", label: "Entry template" },
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

const convertCollectionToFolder = async (
  configAsset: Extract<ContentCollection, { status: "ready" }>["configAsset"]
) => {
  if ($project.get()?.id !== configAsset.projectId) {
    throw new Error("The collection belongs to another project.");
  }
  const result = await executeRuntimeMutationAsync({
    id: "assets.delete",
    input: { assetIds: [configAsset.id], force: true },
  });
  if (result === undefined) {
    throw new Error("The collection could not be converted.");
  }
  onNextTransactionComplete(invalidateAssets);
};

export const CollectionSettingsDialog = ({
  collection: incomingCollection,
  open,
  onOpenChange,
  readTemplateSource = readBuilderAssetSource,
  updateContent = updateBuilderAssetContent,
  updateConfigAndTemplateName = updateCollectionConfigAndTemplateName,
  convertCollection = convertCollectionToFolder,
}: {
  collection: Extract<ContentCollection, { status: "ready" }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readTemplateSource?: typeof readBuilderAssetSource;
  updateContent?: typeof updateBuilderAssetContent;
  updateConfigAndTemplateName?: typeof updateCollectionConfigAndTemplateName;
  convertCollection?: typeof convertCollectionToFolder;
}) => {
  // Keep the editing session stable when our own saves refresh asset metadata.
  const collectionRef = useRef(incomingCollection);
  const editingFolderRef = useRef<string>();
  const collection = collectionRef.current;
  const persistedFields = useRef(
    createEditableFields(collection.config.fields)
  );
  const savedDraft = useRef<string>();
  const attemptedDraft = useRef<string>();
  const savingRef = useRef(false);
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
  const currentTemplateAssetRef = useRef(collection.templateAsset);
  const [templateName, setTemplateName] = useState(
    () => getAssetDisplayNameParts(collection.templateAsset).basename
  );
  const [loadedTemplateKey, setLoadedTemplateKey] = useState<string>();
  const [slugField, setSlugField] = useState(collection.config.slugField);
  const [generateSlugFrom, setGenerateSlugFrom] = useState(
    collection.config.generateSlugFrom
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string>();
  const [showKeyErrors, setShowKeyErrors] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [converting, setConverting] = useState(false);
  const convertingRef = useRef(false);
  const keepCollectionRef = useRef<HTMLButtonElement>(null);
  const [conversionError, setConversionError] = useState<string>();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const assets = useStore($assets);
  const templateKey = collection.templateAsset.id;
  const templateReady = loadedTemplateKey === templateKey;
  const formDisabled = loading || closing || converting;
  const templateLanguageExtensions = useMemo(
    () => getTextFileEditorExtensions(collection.templateAsset),
    [collection.templateAsset]
  );

  useLayoutEffect(() => {
    if (open === false) {
      editingFolderRef.current = undefined;
      return;
    }
    if (editingFolderRef.current === incomingCollection.folderId) {
      return;
    }
    editingFolderRef.current = incomingCollection.folderId;
    collectionRef.current = incomingCollection;
    const collection = incomingCollection;
    const nextFields = createEditableFields(collection.config.fields);
    persistedFields.current = nextFields;
    savedDraft.current = undefined;
    attemptedDraft.current = undefined;
    setFields(nextFields);
    setSelectedFieldRowId(nextFields[0]?.rowId);
    setActiveSection("fields");
    setTemplateName(
      getAssetDisplayNameParts(collection.templateAsset).basename
    );
    currentTemplateAssetRef.current = collection.templateAsset;
    setSlugField(collection.config.slugField);
    setGenerateSlugFrom(collection.config.generateSlugFrom);
    setError(undefined);
    setShowKeyErrors(false);
    setConfirmRemove(false);
    setConfirmDiscard(false);
  }, [incomingCollection, open]);

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

  const selectedFieldIndex = fields.findIndex(
    ({ rowId }) => rowId === selectedFieldRowId
  );
  const moveSelectedField = (direction: -1 | 1) => {
    const nextIndex = selectedFieldIndex + direction;
    if (selectedFieldIndex < 0 || nextIndex < 0 || nextIndex >= fields.length) {
      return;
    }
    setFields((current) => {
      const next = [...current];
      [next[selectedFieldIndex], next[nextIndex]] = [
        next[nextIndex],
        next[selectedFieldIndex],
      ];
      return next;
    });
  };

  const keyErrors = new Map<string, string>();
  for (const field of fields) {
    const key = field.key.trim();
    if (key === "") {
      keyErrors.set(field.rowId, "Enter a field key.");
    } else if (
      fields.some(
        (candidate) =>
          candidate.rowId !== field.rowId && candidate.key.trim() === key
      )
    ) {
      keyErrors.set(field.rowId, "This key is already used by another field.");
    }
  }

  const draft = JSON.stringify({
    fields,
    template,
    templateName,
    slugField,
    generateSlugFrom,
  });
  const initialDraft = JSON.stringify({
    fields: persistedFields.current,
    template: loadedTemplateRef.current,
    templateName: getAssetDisplayNameParts(collection.templateAsset).basename,
    slugField: collection.config.slugField,
    generateSlugFrom: collection.config.generateSlugFrom,
  });
  const isDirty = draft !== (savedDraft.current ?? initialDraft);
  const requestClose = async () => {
    if (savingRef.current) {
      return;
    }
    setClosing(true);
    try {
      if (isDirty && (await save()) !== true) {
        setConfirmDiscard(true);
        return;
      }
      onOpenChange(false);
    } finally {
      setClosing(false);
    }
  };

  const save = async () => {
    if (savingRef.current || loading || templateReady === false) {
      return;
    }
    attemptedDraft.current = draft;
    const keys = fields.map(({ key }) => key.trim());
    if (keyErrors.size > 0) {
      setShowKeyErrors(true);
      setError(undefined);
      return;
    }
    savingRef.current = true;
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
        return {
          ...collectionField,
          originalKey: persistedFields.current.find(
            (candidate) => candidate.rowId === rowId
          )?.key,
          key: keys[index],
        };
      });
      const normalizeLinkedFieldKey = (linkedKey: string) => {
        const fieldIndex = fields.findIndex(({ key }) => key === linkedKey);
        return fieldIndex === -1 ? linkedKey.trim() : keys[fieldIndex];
      };
      const nextSlugField = normalizeLinkedFieldKey(slugField);
      const nextGenerateSlugFrom = normalizeLinkedFieldKey(generateSlugFrom);
      const configSource = serializeCollectionConfig({
        config: collection.config,
        fields: nextFields,
        settings: {
          template: nextTemplateFilename,
          slugField: nextSlugField,
          generateSlugFrom: nextGenerateSlugFrom,
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
      const currentTemplateName = getAssetDisplayNameParts(
        collection.templateAsset
      ).basename;
      const renamesTemplate = nextTemplateName !== currentTemplateName;
      const projectId = collection.configAsset.projectId;
      if ($project.get()?.id !== projectId) {
        throw new Error("The collection belongs to another project.");
      }
      if (template !== loadedTemplateRef.current) {
        currentTemplateAssetRef.current = await updateContent({
          asset: currentTemplateAssetRef.current,
          content: template,
        });
        loadedTemplateRef.current = template;
        // A later config save can fail; track the template write separately.
        savedDraft.current = undefined;
      }
      const currentCollection = {
        ...collection,
        templateAsset: currentTemplateAssetRef.current,
      };
      if (renamesTemplate) {
        const updated = await updateConfigAndTemplateName({
          projectId,
          collection: currentCollection,
          templateFilename: nextTemplateName,
          configSource,
        });
        collectionRef.current = {
          ...currentCollection,
          ...updated,
          config: nextConfig,
        };
        currentTemplateAssetRef.current = updated.templateAsset;
      } else if (
        JSON.stringify(nextConfig.schema) !==
        JSON.stringify(collection.config.schema)
      ) {
        const configAsset = await updateContent({
          asset: collection.configAsset,
          content: configSource,
        });
        collectionRef.current = {
          ...currentCollection,
          configAsset,
          config: nextConfig,
        };
      } else {
        collectionRef.current = currentCollection;
      }
      persistedFields.current = fields.map((field, index) => ({
        ...field,
        key: keys[index],
      }));
      savedDraft.current = draft;
      return true;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Collection settings could not be saved"
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (templateReady && !isDirty) {
      attemptedDraft.current = undefined;
      setError(undefined);
      return;
    }
    if (
      !open ||
      !templateReady ||
      loading ||
      saving ||
      confirmRemove ||
      converting ||
      !isDirty ||
      attemptedDraft.current === draft
    ) {
      return;
    }
    const timeout = setTimeout(() => void saveRef.current(), 600);
    return () => clearTimeout(timeout);
  }, [
    draft,
    open,
    templateReady,
    loading,
    saving,
    isDirty,
    confirmRemove,
    converting,
  ]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (saving === false && converting === false && nextOpen === false) {
          void requestClose();
        }
      }}
    >
      <DialogContent
        width={880}
        height={640}
        css={{ maxWidth: "calc(100vw - 32px)" }}
        aria-describedby={undefined}
      >
        <DialogTitle
          suffix={
            <DialogTitleActions>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SmallIconButton
                    aria-label="Collection actions"
                    disabled={saving || converting}
                    icon={<EllipsesIcon />}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => {
                      setConversionError(undefined);
                      setConfirmRemove(true);
                    }}
                  >
                    Convert to regular folder…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DialogClose />
            </DialogTitleActions>
          }
        >
          Collection settings
        </DialogTitle>
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
            <Grid
              css={{
                minHeight: "100%",
                height: activeSection === "fields" ? "100%" : undefined,
              }}
            >
              <Grid
                css={{
                  display: activeSection === "fields" ? "grid" : "none",
                  minHeight: 0,
                  gridTemplateRows: "auto minmax(0, 1fr)",
                }}
              >
                <Flex
                  justify="between"
                  align="center"
                  gap={4}
                  css={{ padding: theme.spacing[9] }}
                >
                  <Flex gap={1} align="center">
                    <Text variant="titles">Fields</Text>
                    <Tooltip
                      variant="wrapped"
                      content="Define the information editors fill in for every entry."
                    >
                      <InfoCircleIcon
                        color={cssVar("--foreground-secondary")}
                        tabIndex={0}
                        aria-label="About collection fields"
                      />
                    </Tooltip>
                  </Flex>
                  <Button
                    css={{ flexShrink: 0 }}
                    disabled={formDisabled}
                    prefix={<PlusIcon />}
                    onClick={() => {
                      const rowId = `new:${nextRowId.current}`;
                      nextRowId.current += 1;
                      setSelectedFieldRowId(rowId);
                      setFields((current) => [
                        ...current,
                        {
                          key: "",
                          rowId,
                          label: "",
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
                    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)",
                    minHeight: 0,
                  }}
                >
                  <Grid
                    as="nav"
                    aria-label="Collection fields"
                    gap={1}
                    css={{
                      padding: theme.spacing[3],
                      alignContent: "start",
                      overflow: "auto",
                    }}
                  >
                    {fields.map((field) => (
                      <Button
                        key={field.rowId}
                        color="ghost"
                        aria-label={`Edit ${field.label || "New field"}`}
                        aria-pressed={field.rowId === selectedFieldRowId}
                        css={{
                          height: "auto",
                          minHeight: theme.spacing[15],
                          padding: theme.spacing[3],
                          justifyContent: "stretch",
                          textAlign: "left",
                          background:
                            field.rowId === selectedFieldRowId
                              ? selectedItemBackground
                              : undefined,
                        }}
                        onClick={() => setSelectedFieldRowId(field.rowId)}
                      >
                        <Grid gap={1} css={{ minWidth: 0 }}>
                          <Text
                            variant="labels"
                            truncate
                            color={
                              showKeyErrors && keyErrors.has(field.rowId)
                                ? "destructive"
                                : undefined
                            }
                          >
                            {field.label || "New field"}
                          </Text>
                          <Text variant="tiny" color="subtle" truncate>
                            {getEditableType(field)}
                            {field.required ? " · Required" : ""}
                          </Text>
                        </Grid>
                      </Button>
                    ))}
                    <Separator />
                    <Flex gap={1}>
                      <Tooltip content="Move field up">
                        <SmallIconButton
                          aria-label="Move field up"
                          icon={<ArrowUpIcon />}
                          disabled={formDisabled || selectedFieldIndex <= 0}
                          onClick={() => moveSelectedField(-1)}
                        />
                      </Tooltip>
                      <Tooltip content="Move field down">
                        <SmallIconButton
                          aria-label="Move field down"
                          icon={<ArrowDownIcon />}
                          disabled={
                            formDisabled ||
                            selectedFieldIndex < 0 ||
                            selectedFieldIndex === fields.length - 1
                          }
                          onClick={() => moveSelectedField(1)}
                        />
                      </Tooltip>
                    </Flex>
                  </Grid>
                  <Grid
                    css={{
                      minHeight: 0,
                      overflow: "auto",
                      alignContent: "start",
                      gridAutoRows: "max-content",
                      borderLeft: `1px solid ${cssVar("--border-default")}`,
                    }}
                  >
                    {fields.map((field, index) => {
                      if (field.rowId !== selectedFieldRowId) {
                        return;
                      }
                      const protectedField =
                        field.key === slugField ||
                        field.key === generateSlugFrom;
                      const requiredField = field.key === slugField;
                      const keyError = showKeyErrors
                        ? keyErrors.get(field.rowId)
                        : undefined;
                      const keyErrorId =
                        keyError === undefined
                          ? undefined
                          : `collection-field-key-error-${field.rowId}`;
                      const stringField = field.type === "string";
                      const numberField =
                        field.type === "number" || field.type === "integer";
                      return (
                        <Grid key={field.rowId} css={{ alignContent: "start" }}>
                          <Grid gap={3} css={{ padding: theme.spacing[9] }}>
                            <Grid
                              gap={3}
                              css={{
                                gridTemplateColumns:
                                  "minmax(0, 1fr) minmax(0, 1fr)",
                                alignItems: "start",
                              }}
                            >
                              <Grid gap={1}>
                                <Label
                                  htmlFor={`collection-field-label-${field.rowId}`}
                                >
                                  Label
                                </Label>
                                <InputField
                                  id={`collection-field-label-${field.rowId}`}
                                  aria-label={`${field.label || "New field"} label`}
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
                                <Flex gap={1} align="center">
                                  <Label
                                    htmlFor={`collection-field-key-${field.rowId}`}
                                  >
                                    Field key
                                  </Label>
                                  <Tooltip
                                    variant="wrapped"
                                    content="Stored in the entry’s frontmatter. Used to connect this field to your page."
                                  >
                                    <InfoCircleIcon
                                      color={cssVar("--foreground-secondary")}
                                      tabIndex={0}
                                      aria-label="About field key"
                                    />
                                  </Tooltip>
                                </Flex>

                                <InputField
                                  id={`collection-field-key-${field.rowId}`}
                                  aria-label={`${field.label || "New field"} key`}
                                  aria-invalid={
                                    keyError !== undefined || undefined
                                  }
                                  aria-describedby={keyErrorId}
                                  color={
                                    keyError === undefined ? undefined : "error"
                                  }
                                  value={field.key}
                                  disabled={formDisabled}
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

                                {keyError !== undefined && (
                                  <Text
                                    id={keyErrorId}
                                    role="alert"
                                    color="destructive"
                                  >
                                    {keyError}
                                  </Text>
                                )}
                              </Grid>
                            </Grid>
                            <Grid gap={1}>
                              <Flex gap={1} align="center">
                                <Label>Type</Label>
                                {protectedField && (
                                  <Tooltip
                                    variant="wrapped"
                                    content={
                                      requiredField
                                        ? "The slug identifies each entry and is always required."
                                        : "This text field is used to generate the entry slug."
                                    }
                                  >
                                    <InfoCircleIcon
                                      color={cssVar("--foreground-secondary")}
                                      tabIndex={0}
                                      aria-label="About field type"
                                    />
                                  </Tooltip>
                                )}
                              </Flex>
                              <Select
                                aria-label={`${field.label} type`}
                                options={
                                  field.control === "slug"
                                    ? ["Slug"]
                                    : field.key === generateSlugFrom
                                      ? ["Text", "Long text"]
                                      : fieldTypes
                                }
                                value={getEditableType(field)}
                                disabled={formDisabled || requiredField}
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
                          </Grid>
                          {field.control === "slug" && (
                            <Grid
                              gap={2}
                              css={{ padding: theme.spacing[9], paddingTop: 0 }}
                            >
                              <Flex gap={1} align="center">
                                <Label>Generate from</Label>
                                <Tooltip
                                  variant="wrapped"
                                  content="The slug becomes the MDX filename. It is generated from this field when editors create an entry."
                                >
                                  <InfoCircleIcon
                                    color={cssVar("--foreground-secondary")}
                                    tabIndex={0}
                                    aria-label="About slug generation"
                                  />
                                </Tooltip>
                              </Flex>
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
                                onChange={({ key }) => setGenerateSlugFrom(key)}
                              />
                            </Grid>
                          )}
                          <Separator />
                          <Grid gap={3} css={{ padding: theme.spacing[9] }}>
                            <Text variant="labels">Validation</Text>
                            <CheckboxAndLabel>
                              <Checkbox
                                id={`collection-field-required-${field.rowId}`}
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
                              <Label
                                htmlFor={`collection-field-required-${field.rowId}`}
                              >
                                Required field
                              </Label>
                            </CheckboxAndLabel>
                            <Grid
                              gap={3}
                              css={{
                                gridTemplateColumns:
                                  "minmax(0, 1fr) minmax(0, 1fr)",
                              }}
                            >
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
                                      placeholder="No minimum"
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
                                      placeholder="No maximum"
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
                          </Grid>
                          {protectedField === false && (
                            <>
                              <Separator />
                              <Flex css={{ padding: theme.spacing[9] }}>
                                <Button
                                  color="ghost"
                                  prefix={<TrashIcon />}
                                  aria-label={`Remove ${field.label}`}
                                  disabled={formDisabled}
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
                                >
                                  Remove field
                                </Button>
                              </Flex>
                            </>
                          )}
                        </Grid>
                      );
                    })}
                  </Grid>
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
                <Flex gap={1} align="center">
                  <Text variant="titles">Entry template</Text>
                  <Tooltip
                    variant="wrapped"
                    content="Set the frontmatter defaults and starter Markdown copied into every new entry."
                  >
                    <InfoCircleIcon
                      color={cssVar("--foreground-secondary")}
                      tabIndex={0}
                      aria-label="About entry template"
                    />
                  </Tooltip>
                </Flex>
                <Grid gap={1} css={{ maxWidth: 320 }}>
                  <Label htmlFor="collection-template-name">
                    Template name
                  </Label>
                  <InputField
                    id="collection-template-name"
                    aria-label="Entry template name"
                    value={templateName}
                    maxLength={assetResourceLimits.assetFilenameCharacters}
                    suffix={
                      <Text as="span" color="subtle">
                        .mdx
                      </Text>
                    }
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
                  defaultPreviewOpen={false}
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
        {(error !== undefined || saving) && (
          <Flex css={{ padding: theme.panel.padding }}>
            {error !== undefined ? (
              <Text role="alert" color="destructive" variant="tiny">
                {error}
              </Text>
            ) : (
              <Text role="status" color="subtle" variant="tiny">
                Saving…
              </Text>
            )}
          </Flex>
        )}
      </DialogContent>
      <Dialog
        open={confirmRemove}
        onOpenChange={(nextOpen) => {
          if (!convertingRef.current) {
            setConfirmRemove(nextOpen);
          }
        }}
      >
        <DialogContent
          width={420}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            keepCollectionRef.current?.focus();
          }}
        >
          <DialogTitle>Convert to regular folder?</DialogTitle>
          <Grid gap={3} css={{ padding: theme.panel.padding }}>
            <DialogDescription asChild>
              <Text>
                Your entries and template will stay. Collection rules and the
                New entry action will be removed.
              </Text>
            </DialogDescription>
            {isDirty && (
              <Text>Unsaved collection settings will not be applied.</Text>
            )}
            {conversionError !== undefined && (
              <Text role="alert" color="destructive">
                {conversionError}
              </Text>
            )}
            <Flex justify="end" gap={2}>
              <Button
                ref={keepCollectionRef}
                disabled={converting}
                onClick={() => setConfirmRemove(false)}
              >
                Keep collection
              </Button>
              <Button
                color="destructive"
                disabled={converting}
                onClick={async () => {
                  if (convertingRef.current) {
                    return;
                  }
                  convertingRef.current = true;
                  setConverting(true);
                  setConversionError(undefined);
                  try {
                    await convertCollection(collectionRef.current.configAsset);
                    setConfirmRemove(false);
                    onOpenChange(false);
                  } catch (error) {
                    setConversionError(
                      error instanceof Error
                        ? error.message
                        : "The collection could not be converted."
                    );
                  } finally {
                    convertingRef.current = false;
                    setConverting(false);
                  }
                }}
              >
                {converting ? "Converting…" : "Convert to regular folder"}
              </Button>
            </Flex>
          </Grid>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <DialogContent aria-describedby={undefined} width={420}>
          <DialogTitle>Discard changes?</DialogTitle>
          <Grid gap={3} css={{ padding: theme.panel.padding }}>
            <Text>
              Your unsaved collection settings and template changes will be
              lost.
            </Text>
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
                Discard changes
              </Button>
            </Flex>
          </Grid>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
