import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useStore } from "@nanostores/react";
import { Flex, Grid, Label, Select } from "@webstudio-is/design-system";
import { ChevronRightIcon } from "@webstudio-is/icons";
import {
  createAssetFolderHierarchy,
  type AssetFolders,
} from "@webstudio-is/sdk";
import { $assetFolders } from "~/shared/sync/data-stores";

type Option = {
  label: string;
  folderId: string | undefined;
  canUseAsDestination: boolean;
};
const defaultRootLabel = "Top level folder";

export const getAssetFolderSelectValue = (option: Pick<Option, "folderId">) =>
  option.folderId === undefined ? "no-folder" : `folder:${option.folderId}`;

export const createAssetFolderSelectorLevels = ({
  folders,
  value,
  excludedFolderIds,
  unavailableDestinationFolderIds,
  rootLabel = defaultRootLabel,
}: {
  folders: AssetFolders;
  value: string | undefined;
  excludedFolderIds?: ReadonlySet<string>;
  unavailableDestinationFolderIds?: ReadonlySet<string>;
  rootLabel?: string;
}) => {
  const hierarchy = createAssetFolderHierarchy(folders);
  const excludedIds = new Set<string>();
  for (const folderId of excludedFolderIds ?? []) {
    for (const descendantId of hierarchy.getSubtreeIds(folderId)) {
      excludedIds.add(descendantId);
    }
  }
  const getChildren = (parentId: string | undefined) =>
    hierarchy
      .getChildren(parentId)
      .filter((folder) => excludedIds.has(folder.id) === false)
      .toSorted((left, right) => left.name.localeCompare(right.name));
  const path = hierarchy
    .getPath(value)
    .filter(({ id }) => excludedIds.has(id) === false);
  const topOptions: Option[] = [
    { label: "Root", folderId: undefined, canUseAsDestination: true },
    ...getChildren(undefined).map((folder) => ({
      label: folder.name,
      folderId: folder.id,
      canUseAsDestination:
        unavailableDestinationFolderIds?.has(folder.id) !== true,
    })),
  ];
  const levels = [
    {
      ariaLabel: rootLabel,
      options: topOptions,
      selected:
        topOptions.find(({ folderId }) => folderId === path[0]?.id) ??
        topOptions[0],
    },
  ];

  path.forEach((folder, index) => {
    const children = getChildren(folder.id);
    if (children.length === 0) {
      return;
    }
    const options: Option[] = [
      {
        label: "This folder",
        folderId: folder.id,
        canUseAsDestination:
          unavailableDestinationFolderIds?.has(folder.id) !== true,
      },
      ...children.map((child) => ({
        label: child.name,
        folderId: child.id,
        canUseAsDestination:
          unavailableDestinationFolderIds?.has(child.id) !== true,
      })),
    ];
    const nextId = path[index + 1]?.id;
    levels.push({
      ariaLabel: `Asset subfolder level ${index + 1}`,
      options,
      selected:
        options.find(({ folderId }) => folderId === nextId) ?? options[0],
    });
  });
  return levels;
};

export const AssetFolderSelector = ({
  value,
  onChange,
  excludedFolderIds,
  unavailableDestinationFolderIds,
  rootLabel = defaultRootLabel,
  disabled,
  deferChangesUntilBlur = false,
}: {
  value: string | undefined;
  onChange: (folderId: string | undefined) => void;
  excludedFolderIds?: ReadonlySet<string>;
  unavailableDestinationFolderIds?: ReadonlySet<string>;
  rootLabel?: string;
  disabled?: boolean;
  deferChangesUntilBlur?: boolean;
}) => {
  const folders = useStore($assetFolders);
  const selectId = useId();
  const [draftValue, setDraftValue] = useState(value);
  const pendingValue = useRef<{ folderId: string | undefined }>();
  const openSelects = useRef(new Set<number>());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const commitPendingValue = useCallback(() => {
    const pending = pendingValue.current;
    if (pending === undefined) {
      return;
    }
    pendingValue.current = undefined;
    onChangeRef.current(pending.folderId);
  }, []);

  useEffect(() => {
    if (pendingValue.current === undefined) {
      setDraftValue(value);
    }
  }, [value]);

  useEffect(
    () => () => {
      if (deferChangesUntilBlur) {
        commitPendingValue();
      }
    },
    [commitPendingValue, deferChangesUntilBlur]
  );

  const levels = useMemo(
    () =>
      createAssetFolderSelectorLevels({
        folders,
        value: draftValue,
        excludedFolderIds,
        unavailableDestinationFolderIds,
        rootLabel,
      }),
    [
      draftValue,
      excludedFolderIds,
      folders,
      rootLabel,
      unavailableDestinationFolderIds,
    ]
  );

  return (
    <Grid
      gap={1}
      onBlurCapture={(event) => {
        if (deferChangesUntilBlur === false) {
          return;
        }
        const selector = event.currentTarget;
        queueMicrotask(() => {
          if (
            openSelects.current.size > 0 ||
            selector.contains(document.activeElement)
          ) {
            return;
          }
          commitPendingValue();
        });
      }}
    >
      <Label htmlFor={`${selectId}-0`}>{rootLabel}</Label>
      <Flex align="center" gap={1} wrap="wrap">
        {levels.map((level, index) => (
          <Flex key={level.ariaLabel} align="center" gap={1}>
            {index > 0 && <ChevronRightIcon size={12} />}
            <Select
              id={`${selectId}-${index}`}
              aria-label={level.ariaLabel}
              options={level.options}
              value={level.selected}
              disabled={disabled}
              getLabel={(option: Option) => option.label}
              getValue={getAssetFolderSelectValue}
              onOpenChange={(open) => {
                if (open) {
                  openSelects.current.add(index);
                } else {
                  openSelects.current.delete(index);
                }
              }}
              onChange={(option: Option) => {
                setDraftValue(option.folderId);
                if (option.canUseAsDestination === false) {
                  pendingValue.current = undefined;
                  return;
                }
                if (deferChangesUntilBlur) {
                  pendingValue.current = { folderId: option.folderId };
                } else {
                  onChange(option.folderId);
                }
              }}
              css={{ width: "auto", minWidth: "8ch", maxWidth: "18ch" }}
            />
          </Flex>
        ))}
      </Flex>
    </Grid>
  );
};
