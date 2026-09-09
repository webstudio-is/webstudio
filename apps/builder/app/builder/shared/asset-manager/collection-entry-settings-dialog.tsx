import { useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  extractMarkdownFrontmatter,
  getCollectionEntryValidationIssues,
  type CollectionField,
} from "@webstudio-is/content-engine";
import {
  formatAssetName,
  getAssetDisplayNameParts,
  type Asset,
} from "@webstudio-is/sdk";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  PanelContent,
  Text,
} from "@webstudio-is/design-system";
import { $authPermit } from "~/shared/nano-states";
import { $assets } from "~/shared/sync/data-stores";
import {
  readBuilderAssetSource,
  type ContentCollection,
} from "../assets/content-collections";
import { updateAssetContent } from "../assets/update-asset-content";
import { CollectionEntryFields } from "./collection-entry-fields";
import { replaceMdxFrontmatter } from "@webstudio-is/content-engine/mdx";

export const CollectionEntrySettingsDialog = ({
  asset,
  collection,
  onClose,
  onOpenFile,
  readSource = readBuilderAssetSource,
  updateContent = updateAssetContent,
}: {
  asset: Asset;
  collection: Extract<ContentCollection, { status: "ready" }>;
  onClose: () => void;
  onOpenFile: () => void;
  readSource?: typeof readBuilderAssetSource;
  updateContent?: typeof updateAssetContent;
}) => {
  const permit = useStore($authPermit);
  const [loaded, setLoaded] = useState<{
    asset: Asset;
    source: string;
    properties: Readonly<Record<string, unknown>>;
  }>();
  const [values, setValues] = useState<Readonly<Record<string, unknown>>>({});
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [discard, setDiscard] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const focused = useRef(false);
  const savingRef = useRef(false);
  const attemptedDraft = useRef<string>();
  const uncertain = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const source = await readSource({
          projectId: asset.projectId,
          assetId: asset.id,
        });
        if ($assets.get().get(asset.id)?.name !== asset.name) {
          throw new Error(
            "This entry changed while opening. Close and reopen its settings."
          );
        }
        const { properties } = await extractMarkdownFrontmatter(source);
        if (!cancelled) {
          setLoaded({ asset, source, properties });
          setValues(properties);
          setError(undefined);
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "The entry could not be loaded."
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [asset, readSource, attempt]);

  const draft = JSON.stringify(values);
  const dirty =
    loaded !== undefined && draft !== JSON.stringify(loaded.properties);
  useEffect(() => {
    if (loaded !== undefined && !focused.current) {
      formRef.current
        ?.querySelector<HTMLElement>(
          'input:not(:disabled), textarea:not(:disabled), [role="group"] button:not(:disabled)'
        )
        ?.focus();
      focused.current = true;
    }
  }, [loaded]);
  const issues =
    loaded === undefined
      ? []
      : getCollectionEntryValidationIssues({
          config: collection.config,
          properties: values,
          basename: getAssetDisplayNameParts(asset).basename,
        });
  const unconfiguredIssues = issues.filter(
    (issue) =>
      !collection.config.fields.some((field) => field.key === issue.fieldKey)
  );
  const save = async () => {
    if (savingRef.current) {
      return false;
    }
    if (!dirty) {
      return true;
    }
    if (loaded === undefined || permit === "view" || uncertain.current) {
      return false;
    }
    savingRef.current = true;
    setSaving(true);
    attemptedDraft.current = draft;
    try {
      const source = await replaceMdxFrontmatter({
        source: loaded.source,
        properties: values,
      });
      const updatedAsset = await updateContent({
        asset: loaded.asset,
        content: source,
      });
      setLoaded({ asset: updatedAsset, source, properties: values });
      setError(undefined);
      return true;
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ASSET_UPDATE_COMMIT_UNCERTAIN"
      ) {
        uncertain.current = true;
        setError(
          "We couldn’t confirm whether your changes were saved. Keep a copy of your edits, then reload to check the saved version."
        );
      } else {
        setError(
          error instanceof Error
            ? error.message
            : "The entry could not be saved."
        );
      }
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (!dirty || saving || attemptedDraft.current === draft) {
      return;
    }
    const timeout = setTimeout(() => void saveRef.current(), 600);
    return () => clearTimeout(timeout);
  }, [draft, dirty, saving]);
  const close = async (openFile = false) => {
    setClosing(true);
    if (await save()) {
      onClose();
      if (openFile) {
        onOpenFile();
      }
    } else if (!savingRef.current) {
      setDiscard(true);
    }
    setClosing(false);
  };
  const change = (field: CollectionField, value: unknown) => {
    setValues((current) => ({
      ...current,
      [field.key]:
        (field.type === "number" || field.type === "integer") && value !== ""
          ? Number(value)
          : value,
    }));
  };
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) {
            void close();
          }
        }}
      >
        <DialogContent width={560} aria-describedby={undefined}>
          <DialogTitle>Entry settings</DialogTitle>
          <PanelContent
            as={Grid}
            ref={formRef}
            gap={3}
            css={{ maxHeight: "70vh", overflow: "auto" }}
          >
            <Text color="subtle">{formatAssetName(asset)}</Text>
            {error !== undefined && (
              <Text role="alert" color="destructive">
                {error}
              </Text>
            )}
            {loaded === undefined ? (
              error === undefined ? (
                <Text role="status">Loading entry…</Text>
              ) : (
                <Button onClick={() => setAttempt((value) => value + 1)}>
                  Retry
                </Button>
              )
            ) : (
              <CollectionEntryFields
                config={collection.config}
                values={values}
                errors={issues}
                disabled={closing || permit === "view" || uncertain.current}
                readOnlySlug
                onChange={change}
                onReset={(field) =>
                  setValues((current) => {
                    const next = { ...current };
                    delete next[field.key];
                    return next;
                  })
                }
              />
            )}
            {loaded !== undefined &&
              collection.config.slugField !== undefined &&
              values[collection.config.slugField] !==
                getAssetDisplayNameParts(asset).basename && (
                <Button
                  disabled={saving || permit === "view" || uncertain.current}
                  onClick={() =>
                    setValues((current) => ({
                      ...current,
                      [collection.config.slugField!]:
                        getAssetDisplayNameParts(asset).basename,
                    }))
                  }
                >
                  Repair slug to match filename
                </Button>
              )}
            {saving && <Text role="status">Saving…</Text>}
            {unconfiguredIssues.length > 0 && (
              <Grid gap={2}>
                <Text>
                  These fields need collection configuration or an MDX edit:
                </Text>
                {unconfiguredIssues.map((issue) => (
                  <Text key={issue.fieldKey} role="alert" color="destructive">
                    {issue.message}
                  </Text>
                ))}
              </Grid>
            )}
            <Button disabled={saving} onClick={() => void close(true)}>
              Open MDX file
            </Button>
            {loaded !== undefined &&
              error !== undefined &&
              !uncertain.current && (
                <Button disabled={saving} onClick={() => void save()}>
                  Retry save
                </Button>
              )}
          </PanelContent>
        </DialogContent>
      </Dialog>
      <Dialog open={discard} onOpenChange={setDiscard}>
        <DialogContent width={420} aria-describedby={undefined}>
          <DialogTitle>Close without saving?</DialogTitle>
          <PanelContent as={Grid} gap={3}>
            <Text>
              Your latest edits could not be saved. Keep editing to retry, or
              close and discard the local edits.
            </Text>
            <Button onClick={() => setDiscard(false)}>Keep editing</Button>
            <Button color="destructive" onClick={onClose}>
              Discard local edits
            </Button>
          </PanelContent>
        </DialogContent>
      </Dialog>
    </>
  );
};
