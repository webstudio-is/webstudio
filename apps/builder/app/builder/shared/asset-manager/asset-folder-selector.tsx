import { useId, useMemo } from "react";
import { useStore } from "@nanostores/react";
import { Flex, Grid, Label, Select } from "@webstudio-is/design-system";
import { ChevronRightIcon } from "@webstudio-is/icons";
import {
  createAssetFolderHierarchy,
  type AssetFolders,
} from "@webstudio-is/sdk";
import { $assetFolders } from "~/shared/sync/data-stores";

type Option = { label: string; folderId: string | undefined };
const defaultRootLabel = "Top level folder";

export const createAssetFolderSelectorLevels = ({
  folders,
  value,
  excludedFolderId,
  rootLabel = defaultRootLabel,
}: {
  folders: AssetFolders;
  value: string | undefined;
  excludedFolderId?: string;
  rootLabel?: string;
}) => {
  const hierarchy = createAssetFolderHierarchy(folders);
  const excludedIds =
    excludedFolderId === undefined
      ? new Set<string>()
      : hierarchy.getDescendantIds(excludedFolderId).add(excludedFolderId);
  const getChildren = (parentId: string | undefined) =>
    hierarchy
      .getChildren(parentId)
      .filter((folder) => excludedIds.has(folder.id) === false)
      .toSorted((left, right) => left.name.localeCompare(right.name));
  const path = hierarchy
    .getPath(value)
    .filter(({ id }) => excludedIds.has(id) === false);
  const topOptions: Option[] = [
    { label: "No folder", folderId: undefined },
    ...getChildren(undefined).map((folder) => ({
      label: folder.name,
      folderId: folder.id,
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
      },
      ...children.map((child) => ({
        label: child.name,
        folderId: child.id,
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
  excludedFolderId,
  rootLabel = defaultRootLabel,
  disabled,
}: {
  value: string | undefined;
  onChange: (folderId: string | undefined) => void;
  excludedFolderId?: string;
  rootLabel?: string;
  disabled?: boolean;
}) => {
  const folders = useStore($assetFolders);
  const selectId = useId();
  const levels = useMemo(
    () =>
      createAssetFolderSelectorLevels({
        folders,
        value,
        excludedFolderId,
        rootLabel,
      }),
    [excludedFolderId, folders, rootLabel, value]
  );

  return (
    <Grid gap={1}>
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
              getValue={(option: Option) => option.folderId ?? ""}
              onChange={(option: Option) => onChange(option.folderId)}
              css={{ width: "auto", minWidth: "8ch", maxWidth: "18ch" }}
            />
          </Flex>
        ))}
      </Flex>
    </Grid>
  );
};
