import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import isValidFilename from "valid-filename";
import { useStore } from "@nanostores/react";
import {
  getCollectionTemplateValidationError,
  getCollectionFieldLimitsIssue,
  getCollectionEntryCreationError,
  parseCollectionConfig,
  serializeCollectionConfig,
  type CollectionField,
} from "@webstudio-is/content-engine";
import { parseMdxDocument } from "@webstudio-is/content-engine/mdx";
import {
  PanelContent,
  InsetList,
  InsetListItem,
  Button,
  Checkbox,
  CheckboxAndLabel,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTitleActions,
  DialogClose,
  Flex,
  Grid,
  InputField,
  Label,
  List,
  ListItem,
  PanelBanner,
  panelBannerIconColor,
  rawTheme,
  ResettableLabel,
  ScrollAreaNative,
  Select,
  Separator,
  Text,
  Tooltip,
  cssVar,
  theme,
} from "@webstudio-is/design-system";
import {
  AlertCircleIcon,
  InfoCircleIcon,
  PlusIcon,
  TrashIcon,
  ListViewIcon,
} from "@webstudio-is/icons";
import {
  formatAssetName,
  getAssetDisplayNameParts,
  getPagePath,
} from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import { $assets, $pages, $project } from "~/shared/sync/data-stores";
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
import { getCollectionEntryCanvasTarget } from "./collection-entry-navigation";

type EditableType =
  | "Text"
  | "Long text"
  | "Slug"
  | "Number"
  | "Whole number"
  | "Boolean";
type EditableCollectionField = CollectionField & { rowId: string };
type SettingsSection = "fields" | "template" | "entryPage";
const settingsSections: readonly {
  id: SettingsSection;
  label: string;
}[] = [
  { id: "fields", label: "Fields" },
  { id: "template", label: "Entry template" },
  { id: "entryPage", label: "Entry page" },
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
    description: field.description,
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

export const ConvertCollectionDialog = ({
  configAsset,
  onClose,
  onConverted,
  onConvertingChange,
  hasUnsavedChanges = false,
  convertCollection = convertCollectionToFolder,
}: {
  configAsset: Extract<ContentCollection, { status: "ready" }>["configAsset"];
  onClose: () => void;
  onConverted?: () => void;
  onConvertingChange?: (converting: boolean) => void;
  hasUnsavedChanges?: boolean;
  convertCollection?: typeof convertCollectionToFolder;
}) => {
  const [converting, setConverting] = useState(false);
  const convertingRef = useRef(false);
  const [error, setError] = useState<string>();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !convertingRef.current) {
          onClose();
        }
      }}
    >
      <DialogContent width={420}>
        <DialogTitle>Convert to regular folder?</DialogTitle>
        <PanelContent as={Grid} gap={3}>
          <DialogDescription asChild>
            <Text>
              Your entries and template will stay. Collection rules and the New
              entry action will be removed.
            </Text>
          </DialogDescription>
          {hasUnsavedChanges && (
            <Text>Unsaved collection settings will not be applied.</Text>
          )}
          {error !== undefined && (
            <Text role="alert" color="destructive">
              {error}
            </Text>
          )}
          <Flex justify="end" gap={2}>
            <Button disabled={converting} onClick={onClose}>
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
                onConvertingChange?.(true);
                setError(undefined);
                try {
                  await convertCollection(configAsset);
                  onConverted?.();
                  onClose();
                } catch (error) {
                  setError(
                    error instanceof Error
                      ? error.message
                      : "The collection could not be converted."
                  );
                } finally {
                  convertingRef.current = false;
                  setConverting(false);
                  onConvertingChange?.(false);
                }
              }}
            >
              {converting ? "Converting…" : "Convert to regular folder"}
            </Button>
          </Flex>
        </PanelContent>
      </DialogContent>
    </Dialog>
  );
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
  const [entryPageId, setEntryPageId] = useState(collection.config.entryPageId);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldsError, setFieldsError] = useState<string>();
  const [templateError, setTemplateError] = useState<string>();
  const [saveUncertain, setSaveUncertain] = useState(false);
  const [showKeyErrors, setShowKeyErrors] = useState(false);
  const [pristineInputs, setPristineInputs] = useState(new Set<string>());
  const focusLabelRowId = useRef<string>();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [converting, setConverting] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const assets = useStore($assets);
  const pages = useStore($pages);
  const entryPageOptions = useMemo(
    () =>
      pages === undefined
        ? []
        : Array.from(pages.pages.values())
            .filter(
              (page) =>
                getCollectionEntryCanvasTarget({
                  entryPageId: page.id,
                  entryBasename: "entry",
                  pages,
                }) !== undefined
            )
            .map((page) => ({
              id: page.id,
              label: `${page.name} · ${getPagePath(page.id, pages)}`,
            })),
    [pages]
  );
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
    setEntryPageId(collection.config.entryPageId);
    setError(undefined);
    setSaveUncertain(false);
    setShowKeyErrors(false);
    setPristineInputs(new Set());
    focusLabelRowId.current = undefined;
    setFieldsError(undefined);
    setTemplateError(undefined);
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

  const keyErrors = new Map<string, string>();
  const labelErrors = new Map<string, string>();
  for (const field of fields) {
    if (field.label.trim() === "") {
      labelErrors.set(field.rowId, "Enter a field label.");
    }
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

  const touchInput = (id: string) => {
    setPristineInputs((current) => {
      if (!current.has(id)) {
        return current;
      }
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  };

  const draft = JSON.stringify({
    fields,
    template,
    templateName,
    slugField,
    generateSlugFrom,
    entryPageId,
  });
  const initialDraft = JSON.stringify({
    fields: persistedFields.current,
    template: loadedTemplateRef.current,
    templateName: getAssetDisplayNameParts(collection.templateAsset).basename,
    slugField: collection.config.slugField,
    generateSlugFrom: collection.config.generateSlugFrom,
    entryPageId: collection.config.entryPageId,
  });
  const isDirty = draft !== (savedDraft.current ?? initialDraft);
  const requestClose = async () => {
    if (savingRef.current) {
      return;
    }
    setClosing(true);
    setPristineInputs(new Set());
    try {
      if (saveUncertain || (isDirty && (await save()) !== true)) {
        setConfirmDiscard(true);
        return;
      }
      onOpenChange(false);
    } finally {
      setClosing(false);
    }
  };

  const save = async () => {
    if (
      saveUncertain ||
      savingRef.current ||
      loading ||
      templateReady === false
    ) {
      return;
    }
    attemptedDraft.current = draft;
    const keys = fields.map(({ key }) => key.trim());
    setFieldsError(undefined);
    setTemplateError(undefined);
    if (keyErrors.size > 0 || labelErrors.size > 0) {
      setShowKeyErrors(true);
      setError(undefined);
      return;
    }
    if (
      fields.some((field) => getCollectionFieldLimitsIssue(field) !== undefined)
    ) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(undefined);
    let errorTarget: "fields" | "template" | "dialog" = "template";
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
      const normalizeLinkedFieldKey = (linkedKey: string | undefined) => {
        if (linkedKey === undefined) {
          return;
        }
        const fieldIndex = fields.findIndex(({ key }) => key === linkedKey);
        return fieldIndex === -1 ? linkedKey.trim() : keys[fieldIndex];
      };
      const nextSlugField = normalizeLinkedFieldKey(slugField);
      const nextGenerateSlugFrom = normalizeLinkedFieldKey(generateSlugFrom);
      errorTarget = "fields";
      const configSource = serializeCollectionConfig({
        config: collection.config,
        fields: nextFields,
        settings: {
          template: nextTemplateFilename,
          slugField: nextSlugField,
          generateSlugFrom: nextGenerateSlugFrom,
          entryPageId,
        },
      });
      const nextConfig = parseCollectionConfig(configSource);
      const creationError = getCollectionEntryCreationError(nextConfig);
      if (creationError !== undefined) {
        throw new Error(creationError);
      }
      errorTarget = "template";
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
      errorTarget = "dialog";
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
        JSON.stringify(nextConfig) !== JSON.stringify(collection.config)
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
      if (errorTarget !== "dialog") {
        const message =
          error instanceof Error ? error.message : "Check these settings.";
        if (errorTarget === "fields") {
          setFieldsError(message);
        } else {
          setTemplateError(message);
        }
        return;
      }
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ASSET_UPDATE_COMMIT_UNCERTAIN"
      ) {
        setSaveUncertain(true);
        setError(
          "We couldn’t confirm whether your changes were saved. Your edits are still here. Keep a copy of them, then reload the page to check the saved version before editing again."
        );
        return;
      }
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
    if (saveUncertain) {
      return;
    }
    if (templateReady && !isDirty) {
      attemptedDraft.current = undefined;
      setError(undefined);
      setFieldsError(undefined);
      setTemplateError(undefined);
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
    saveUncertain,
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
              <Tooltip content="Convert to regular folder">
                <Button
                  color="ghost-destructive"
                  prefix={<ListViewIcon />}
                  aria-label="Convert to regular folder"
                  disabled={saving || converting || saveUncertain}
                  onClick={() => setConfirmRemove(true)}
                />
              </Tooltip>
              <DialogClose />
            </DialogTitleActions>
          }
        >
          Collection settings
        </DialogTitle>
        {error !== undefined && (
          <PanelBanner variant="error" role="alert" css={{ flexShrink: 0 }}>
            <Flex align="center" gap={1}>
              <AlertCircleIcon
                color={panelBannerIconColor}
                fill="currentColor"
              />
              <Text variant="regularBold">
                {saveUncertain
                  ? "Saving paused"
                  : "Collection settings need attention"}
              </Text>
            </Flex>
            <Text>{error}</Text>
          </PanelBanner>
        )}
        <Flex grow>
          <List asChild>
            <InsetList
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
                  <InsetListItem>
                    <Text variant="labels">{label}</Text>
                  </InsetListItem>
                </ListItem>
              ))}
            </InsetList>
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
                  gridTemplateRows: "auto minmax(0, 1fr)",
                }}
              >
                <PanelContent
                  as={Flex}
                  justify="between"
                  align="center"
                  gap={4}
                >
                  <Flex gap={1} align="center">
                    <Text variant="titles">Fields</Text>
                    {fieldsError !== undefined && (
                      <Text role="alert" color="destructive">
                        {fieldsError}
                      </Text>
                    )}
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
                      focusLabelRowId.current = rowId;
                      setPristineInputs(
                        (current) =>
                          new Set([
                            ...current,
                            `${rowId}:label`,
                            `${rowId}:key`,
                          ])
                      );
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
                </PanelContent>
                <Grid
                  css={{
                    borderTop: `1px solid ${cssVar("--border-default")}`,
                    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)",
                  }}
                >
                  <List asChild aria-label="Collection fields">
                    <InsetList css={{ overflow: "auto" }}>
                      {fields.map((field, index) => (
                        <ListItem
                          key={field.rowId}
                          asChild
                          index={index}
                          current={field.rowId === selectedFieldRowId}
                          onSelect={() => setSelectedFieldRowId(field.rowId)}
                        >
                          <InsetListItem
                            aria-label={`Edit ${field.label || "New field"}`}
                            css={{
                              minHeight: theme.spacing[15],
                            }}
                          >
                            <Grid gap={1} css={{ minWidth: 0 }}>
                              <Text
                                variant="labels"
                                truncate
                                color={
                                  showKeyErrors &&
                                  ((keyErrors.has(field.rowId) &&
                                    !pristineInputs.has(
                                      `${field.rowId}:key`
                                    )) ||
                                    (labelErrors.has(field.rowId) &&
                                      !pristineInputs.has(
                                        `${field.rowId}:label`
                                      )))
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
                          </InsetListItem>
                        </ListItem>
                      ))}
                    </InsetList>
                  </List>
                  <Grid
                    css={{
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
                      const keyError =
                        showKeyErrors &&
                        !pristineInputs.has(`${field.rowId}:key`)
                          ? keyErrors.get(field.rowId)
                          : undefined;
                      const keyErrorId =
                        keyError === undefined
                          ? undefined
                          : `collection-field-key-error-${field.rowId}`;
                      const stringField = field.type === "string";
                      const labelError =
                        showKeyErrors &&
                        !pristineInputs.has(`${field.rowId}:label`)
                          ? labelErrors.get(field.rowId)
                          : undefined;
                      const labelErrorId =
                        labelError === undefined
                          ? undefined
                          : `collection-field-label-error-${field.rowId}`;
                      const numberField =
                        field.type === "number" || field.type === "integer";
                      const limitsIssue = getCollectionFieldLimitsIssue(field);
                      return (
                        <Grid key={field.rowId} css={{ alignContent: "start" }}>
                          <PanelContent as={Grid} gap={3}>
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
                                  inputRef={(element) => {
                                    if (
                                      element &&
                                      focusLabelRowId.current === field.rowId
                                    ) {
                                      focusLabelRowId.current = undefined;
                                      element.focus();
                                    }
                                  }}
                                  aria-label={`${
                                    field.label || "New field"
                                  } label`}
                                  value={field.label}
                                  aria-invalid={
                                    labelError !== undefined || undefined
                                  }
                                  color={
                                    labelError === undefined
                                      ? undefined
                                      : "error"
                                  }
                                  aria-describedby={labelErrorId}
                                  disabled={formDisabled}
                                  onBlur={() =>
                                    touchInput(`${field.rowId}:label`)
                                  }
                                  onChange={(event) => {
                                    touchInput(`${field.rowId}:label`);
                                    updateField(index, {
                                      ...field,
                                      label: event.target.value,
                                    });
                                  }}
                                />
                                {labelError !== undefined && (
                                  <Text
                                    id={labelErrorId}
                                    role="alert"
                                    color="destructive"
                                  >
                                    {labelError}
                                  </Text>
                                )}
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
                                  aria-label={`${
                                    field.label || "New field"
                                  } key`}
                                  aria-invalid={
                                    keyError !== undefined || undefined
                                  }
                                  aria-describedby={keyErrorId}
                                  color={
                                    keyError === undefined ? undefined : "error"
                                  }
                                  value={field.key}
                                  disabled={formDisabled}
                                  onBlur={() =>
                                    touchInput(`${field.rowId}:key`)
                                  }
                                  onChange={(event) => {
                                    touchInput(`${field.rowId}:key`);
                                    const nextKey = event.target.value;
                                    if (field.control === "slug") {
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
                              <Label
                                htmlFor={`collection-field-description-${field.rowId}`}
                              >
                                Description
                              </Label>
                              <InputField
                                id={`collection-field-description-${field.rowId}`}
                                aria-label={`${field.label || "New field"} description`}
                                placeholder="Help editors understand what to enter"
                                value={field.description ?? ""}
                                disabled={formDisabled}
                                onChange={(event) =>
                                  updateField(index, {
                                    ...field,
                                    description:
                                      event.target.value === ""
                                        ? undefined
                                        : event.target.value,
                                  })
                                }
                              />
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
                                  field.key === generateSlugFrom
                                    ? ["Text", "Long text"]
                                    : fieldTypes
                                }
                                value={getEditableType(field)}
                                disabled={formDisabled}
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
                                  if (field.control === "slug") {
                                    setSlugField(undefined);
                                    setGenerateSlugFrom(undefined);
                                  }
                                  updateField(
                                    index,
                                    setFieldType(field, editableType)
                                  );
                                }}
                              />
                            </Grid>
                          </PanelContent>
                          {field.control === "slug" && (
                            <PanelContent
                              as={Grid}
                              gap={2}
                              css={{
                                paddingTop: 0,
                              }}
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
                              <Select<{ key: string; label: string }>
                                aria-label="Generate slug from"
                                options={[
                                  { key: "", label: "None (manual entry)" },
                                  ...fields.filter(
                                    (candidate) =>
                                      candidate.type === "string" &&
                                      candidate.key.trim() !== "" &&
                                      candidate.key !== field.key
                                  ),
                                ]}
                                value={
                                  fields.find(
                                    ({ key }) => key === generateSlugFrom
                                  ) ?? { key: "", label: "None (manual entry)" }
                                }
                                getValue={({ key }) => JSON.stringify(key)}
                                getLabel={({ label, key }) =>
                                  key === "" ? label : `${label} (${key})`
                                }
                                disabled={formDisabled}
                                onChange={({ key }) =>
                                  setGenerateSlugFrom(key || undefined)
                                }
                              />
                            </PanelContent>
                          )}
                          <Separator />
                          <PanelContent as={Grid} gap={3}>
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
                                    <Tooltip
                                      open={
                                        limitsIssue?.input ===
                                        (stringField ? "minLength" : "minimum")
                                          ? undefined
                                          : false
                                      }
                                      content={
                                        limitsIssue?.input ===
                                        (stringField ? "minLength" : "minimum")
                                          ? limitsIssue.message
                                          : ""
                                      }
                                    >
                                      <InputField
                                        aria-label={`${field.label} ${
                                          stringField
                                            ? "minimum length"
                                            : "minimum"
                                        }`}
                                        type="number"
                                        placeholder="No minimum"
                                        min={stringField ? 0 : undefined}
                                        color={
                                          limitsIssue?.input ===
                                          (stringField
                                            ? "minLength"
                                            : "minimum")
                                            ? "error"
                                            : undefined
                                        }
                                        aria-invalid={
                                          limitsIssue?.input ===
                                            (stringField
                                              ? "minLength"
                                              : "minimum") || undefined
                                        }
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
                                    </Tooltip>
                                  </Grid>
                                  <Grid gap={1}>
                                    <Label>
                                      {stringField
                                        ? "Maximum length"
                                        : "Maximum"}
                                    </Label>
                                    <Tooltip
                                      open={
                                        limitsIssue?.input ===
                                        (stringField ? "maxLength" : "maximum")
                                          ? undefined
                                          : false
                                      }
                                      content={
                                        limitsIssue?.input ===
                                        (stringField ? "maxLength" : "maximum")
                                          ? limitsIssue.message
                                          : ""
                                      }
                                    >
                                      <InputField
                                        aria-label={`${field.label} ${
                                          stringField
                                            ? "maximum length"
                                            : "maximum"
                                        }`}
                                        type="number"
                                        placeholder="No maximum"
                                        min={stringField ? 0 : undefined}
                                        color={
                                          limitsIssue?.input ===
                                          (stringField
                                            ? "maxLength"
                                            : "maximum")
                                            ? "error"
                                            : undefined
                                        }
                                        aria-invalid={
                                          limitsIssue?.input ===
                                            (stringField
                                              ? "maxLength"
                                              : "maximum") || undefined
                                        }
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
                                    </Tooltip>
                                  </Grid>
                                </>
                              )}
                            </Grid>
                          </PanelContent>
                          {protectedField === false && (
                            <>
                              <Separator />
                              <PanelContent as={Flex}>
                                <Button
                                  color="destructive"
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
                              </PanelContent>
                            </>
                          )}
                        </Grid>
                      );
                    })}
                  </Grid>
                </Grid>
              </Grid>
              <PanelContent
                as={Grid}
                data-floating-panel-container
                css={{
                  display: activeSection === "template" ? "grid" : "none",
                  gridTemplateRows: "auto auto minmax(320px, 1fr)",
                  gap: theme.spacing[3],
                  minHeight: "100%",
                }}
              >
                <Flex gap={1} align="center">
                  <Text variant="titles">Entry template</Text>
                  <Tooltip
                    variant="wrapped"
                    content="Every new entry starts as a copy of this template. Add headings, placeholder text, and default field values so editors have a consistent starting point. Changes to the template only affect future entries."
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
                <Grid
                  css={{
                    gridTemplateRows: templateError ? "auto 1fr" : "1fr",
                  }}
                >
                  {templateError !== undefined && (
                    <Text role="alert" color="destructive">
                      {templateError}
                    </Text>
                  )}
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
              </PanelContent>
              <PanelContent
                as={Grid}
                css={{
                  display: activeSection === "entryPage" ? "grid" : "none",
                  alignContent: "start",
                  gap: theme.spacing[3],
                }}
              >
                <Grid gap={1}>
                  <Text variant="titles">Entry page</Text>
                  <Text color="subtle">
                    Choose the page that displays entries from this collection.
                    Editors can then open an entry on the canvas from its menu
                    or settings.
                  </Text>
                </Grid>
                <Grid gap={1} css={{ maxWidth: 400 }}>
                  <ResettableLabel
                    htmlFor="collection-entry-page"
                    onReset={
                      entryPageId === undefined
                        ? undefined
                        : () => setEntryPageId(undefined)
                    }
                  >
                    Page
                  </ResettableLabel>
                  <Select
                    id="collection-entry-page"
                    aria-label="Entry page"
                    options={entryPageOptions}
                    value={entryPageOptions.find(
                      (option) => option.id === entryPageId
                    )}
                    placeholder="No entry page"
                    getValue={(option) => option.id}
                    getLabel={(option) => option.label}
                    disabled={formDisabled || pages === undefined}
                    onChange={(option) => setEntryPageId(option.id)}
                  />
                  {entryPageId !== undefined &&
                    entryPageOptions.some(
                      (option) => option.id === entryPageId
                    ) === false && (
                      <Text color="destructive" role="alert">
                        The configured page no longer exists or has more than
                        one URL parameter. Choose another page.
                      </Text>
                    )}
                </Grid>
              </PanelContent>
            </Grid>
          </ScrollAreaNative>
        </Flex>
        {saving && (
          <PanelContent as={Flex}>
            <Text role="status" color="subtle" variant="tiny">
              Saving…
            </Text>
          </PanelContent>
        )}
      </DialogContent>
      {confirmRemove && (
        <ConvertCollectionDialog
          configAsset={collectionRef.current.configAsset}
          hasUnsavedChanges={isDirty}
          convertCollection={convertCollection}
          onConvertingChange={setConverting}
          onClose={() => setConfirmRemove(false)}
          onConverted={() => onOpenChange(false)}
        />
      )}
      <Dialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <DialogContent aria-describedby={undefined} width={420}>
          <DialogTitle>Discard changes?</DialogTitle>
          <PanelContent as={Grid} gap={3}>
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
          </PanelContent>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
