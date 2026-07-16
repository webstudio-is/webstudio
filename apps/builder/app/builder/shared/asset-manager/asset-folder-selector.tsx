import { useId, useMemo } from "react";
import { useStore } from "@nanostores/react";
import { Flex, Grid, Label, Select } from "@webstudio-is/design-system";
import { ChevronRightIcon } from "@webstudio-is/icons";
import {
  getAssetFolderDescendantIds,
  getAssetFolderPath,
  type AssetFolders,
} from "@webstudio-is/sdk";
import { $assetFolders } from "~/shared/sync/data-stores";

type Option = { label: string; value: string; folderId: string | undefined };

export const createAssetFolderSelectorLevels = ({
  folders,
  value,
  excludedFolderId,
  rootLabel = "Top level folder",
}: {
  folders: AssetFolders;
  value: string | undefined;
  excludedFolderId?: string;
  rootLabel?: string;
}) => {
  const excludedIds =
    excludedFolderId === undefined
      ? new Set<string>()
      : getAssetFolderDescendantIds(folders, excludedFolderId).add(
          excludedFolderId
        );
  const getChildren = (parentId: string | undefined) =>
    Array.from(folders.values())
      .filter(
        (folder) =>
          folder.parentId === parentId && excludedIds.has(folder.id) === false
      )
      .sort((left, right) => left.name.localeCompare(right.name));
  const path = getAssetFolderPath(folders, value).filter(
    ({ id }) => excludedIds.has(id) === false
  );
  const topOptions: Option[] = [
    { label: "No folder", value: "root:", folderId: undefined },
    ...getChildren(undefined).map((folder) => ({
      label: folder.name,
      value: `folder:${folder.id}`,
      folderId: folder.id,
    })),
  ];
  const levels = [
    {
      key: "level:root",
      label: rootLabel,
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
        value: `current:${folder.id}`,
        folderId: folder.id,
      },
      ...children.map((child) => ({
        label: child.name,
        value: `folder:${child.id}`,
        folderId: child.id,
      })),
    ];
    const nextId = path[index + 1]?.id;
    levels.push({
      key: `level:${folder.id}`,
      label: `Subfolder level ${index + 1}`,
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
  rootLabel,
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
      <Label htmlFor={`${selectId}-0`}>{levels[0].label}</Label>
      <Flex align="center" gap={1} wrap="wrap">
        {levels.map((level, index) => (
          <Flex key={level.key} align="center" gap={1}>
            {index > 0 && <ChevronRightIcon size={12} />}
            <Select
              id={`${selectId}-${index}`}
              aria-label={level.ariaLabel}
              options={level.options}
              value={level.selected}
              disabled={disabled}
              getLabel={(option: Option) => option.label}
              getValue={(option: Option) => option.value}
              onChange={(option: Option) => onChange(option.folderId)}
              css={{ width: "auto", minWidth: "8ch", maxWidth: "18ch" }}
            />
          </Flex>
        ))}
      </Flex>
    </Grid>
  );
};
