import { z } from "zod";
import { type FocusEventHandler, useState, useCallback } from "react";
import { useStore } from "@nanostores/react";
import { useDebouncedCallback } from "use-debounce";
import { useUnmount } from "react-use";
import slugify from "slugify";
import { Folder, FolderName, FolderSlug, Pages } from "@webstudio-is/sdk";
import {
  theme,
  Button,
  Box,
  Label,
  InputErrorsTooltip,
  Tooltip,
  InputField,
  Grid,
  ScrollArea,
  rawTheme,
  Flex,
  Select,
} from "@webstudio-is/design-system";
import {
  ChevronDoubleLeftIcon,
  TrashIcon,
  HelpIcon,
} from "@webstudio-is/icons";
import { useIds } from "~/shared/form-utils";
import { Header, HeaderSuffixSpacer } from "../../header";
import { $pages } from "~/shared/nano-states";
import { nanoid } from "nanoid";
import { serverSyncStore } from "~/shared/sync";
import { useEffectEvent } from "~/builder/features/ai/hooks/effect-event";
import { removeByMutable } from "~/shared/array-utils";
import {
  findParentFolderByChildId,
  cleanupChildRefsMutable,
  isSlugUsed,
} from "./page-utils";
import { createRootFolder } from "@webstudio-is/project-build";

const fieldDefaultValues = {
  name: "Untitled",
  slug: "untitled",
  parentFolderId: createRootFolder().id,
};

const fieldNames = Object.keys(
  fieldDefaultValues
) as (keyof typeof fieldDefaultValues)[];

type FieldName = (typeof fieldNames)[number];

type Values = typeof fieldDefaultValues;

type Errors = {
  [fieldName in FieldName]?: string[];
};

const FolderValues = z.object({
  name: FolderName,
  slug: FolderSlug,
});

const validateValues = (
  pages: undefined | Pages,
  values: Values,
  folderId?: Folder["id"]
): Errors => {
  const parsedResult = FolderValues.safeParse(values);
  const errors: Errors = {};
  if (parsedResult.success === false) {
    return parsedResult.error.formErrors.fieldErrors;
  }
  if (pages !== undefined && values.slug !== undefined) {
    if (
      isSlugUsed(
        values.slug,
        pages.folders,
        values.parentFolderId,
        folderId
      ) === false
    ) {
      errors.slug = errors.slug ?? [];
      errors.slug.push(`Slug "${values.slug}" is already in use`);
    }
  }
  return errors;
};

const toFormValues = (
  folderId: Folder["id"],
  folders: Array<Folder>
): Values => {
  const folder = folders.find(({ id }) => id === folderId);
  const parentFolder = findParentFolderByChildId(folderId, folders);
  return {
    name: folder?.name ?? "",
    slug: folder?.slug ?? "",
    parentFolderId: parentFolder?.id ?? "root",
  };
};

const autoSelectHandler: FocusEventHandler<HTMLInputElement> = (event) =>
  event.target.select();

const FormFields = ({
  disabled,
  autoSelect,
  errors,
  values,
  folderId,
  onChange,
}: {
  disabled?: boolean;
  autoSelect?: boolean;
  errors: Errors;
  values: Values;
  folderId: Folder["id"];
  onChange: (
    event: {
      [K in keyof Values]: {
        field: K;
        value: Values[K];
      };
    }[keyof Values]
  ) => void;
}) => {
  const fieldIds = useIds(fieldNames);
  const pages = useStore($pages);

  if (pages === undefined) {
    return;
  }

  // @todo this is a hack to get the scroll area to work needs to be removed
  const TOPBAR_HEIGHT = 40;
  const HEADER_HEIGHT = 40;
  const FOOTER_HEIGHT = 24;
  const SCROLL_AREA_DELTA = TOPBAR_HEIGHT + HEADER_HEIGHT + FOOTER_HEIGHT;

  return (
    <Grid>
      <ScrollArea css={{ maxHeight: `calc(100vh - ${SCROLL_AREA_DELTA}px)` }}>
        <Grid gap={3} css={{ my: theme.spacing[5], mx: theme.spacing[8] }}>
          <Grid gap={1}>
            <Label htmlFor={fieldIds.name}>Folder Name</Label>
            <InputErrorsTooltip errors={errors.name}>
              <InputField
                tabIndex={1}
                color={errors.name && "error"}
                id={fieldIds.name}
                autoFocus
                onFocus={autoSelect ? autoSelectHandler : undefined}
                name="name"
                placeholder="About"
                disabled={disabled}
                value={values.name}
                onChange={(event) => {
                  onChange({ field: "name", value: event.target.value });
                }}
              />
            </InputErrorsTooltip>
          </Grid>

          <Grid gap={1}>
            <Label htmlFor={fieldIds.name}>Parent Folder</Label>
            <InputErrorsTooltip errors={errors.name}>
              <Select
                tabIndex={1}
                css={{ zIndex: theme.zIndices[1] }}
                options={pages.folders.filter(
                  // Prevent selecting yourself as a parent
                  ({ id }) => folderId !== id
                )}
                getValue={(folder) => folder.id}
                getLabel={(folder) => folder.name}
                value={pages.folders.find(
                  ({ id }) => id === values.parentFolderId
                )}
                onChange={(folder) => {
                  onChange({
                    field: "parentFolderId",
                    value: folder.id,
                  });
                }}
              />
            </InputErrorsTooltip>
          </Grid>

          <Grid gap={1}>
            <Label htmlFor={fieldIds.slug}>
              <Flex align="center" css={{ gap: theme.spacing[3] }}>
                Slug
                <Tooltip
                  content={"@todo tooltip content for slug"}
                  variant="wrapped"
                >
                  <HelpIcon
                    color={rawTheme.colors.foregroundSubtle}
                    tabIndex={0}
                  />
                </Tooltip>
              </Flex>
            </Label>
            <InputErrorsTooltip errors={errors.slug}>
              <InputField
                tabIndex={1}
                color={errors.slug && "error"}
                id={fieldIds.slug}
                name="slug"
                placeholder="folder"
                disabled={disabled}
                value={values?.slug}
                onChange={(event) => {
                  onChange({
                    field: "slug",
                    value: event.target.value,
                  });
                }}
              />
            </InputErrorsTooltip>
          </Grid>
        </Grid>
      </ScrollArea>
    </Grid>
  );
};

const nameToSlug = (name: string) => {
  if (name === "") {
    return "";
  }

  return slugify(name, { lower: true, strict: true });
};

export const newFolderId = "new-folder";

export const NewFolderSettings = ({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (folderId: Folder["id"]) => void;
}) => {
  const pages = useStore($pages);

  const [values, setValues] = useState<Values>({
    ...fieldDefaultValues,
    slug: nameToSlug(fieldDefaultValues.name),
  });

  const errors = validateValues(pages, values);
  const handleSubmit = () => {
    if (Object.keys(errors).length === 0) {
      const folderId = nanoid();
      // @todo move to a function
      serverSyncStore.createTransaction([$pages], (pages) => {
        if (pages === undefined) {
          return;
        }
        pages.folders.push({
          id: folderId,
          name: values.name,
          slug: values.slug,
          children: [],
        } satisfies Folder);
        const parentFolder = pages.folders.find(
          ({ id }) => id === values.parentFolderId
        );
        parentFolder?.children.push(folderId);
      });

      onSuccess(folderId);
    }
  };

  return (
    <NewFolderSettingsView
      onSubmit={handleSubmit}
      onClose={onClose}
      isSubmitting={false}
    >
      <FormFields
        autoSelect
        errors={errors}
        disabled={false}
        values={values}
        folderId={newFolderId}
        onChange={(value) => {
          setValues((values) => {
            const changes = { [value.field]: value.value };

            if (value.field === "name") {
              if (values.slug === nameToSlug(values.name)) {
                changes.slug = nameToSlug(value.value);
              }
            }
            return { ...values, ...changes };
          });
        }}
      />
    </NewFolderSettingsView>
  );
};

const NewFolderSettingsView = ({
  onSubmit,
  isSubmitting,
  onClose,
  children,
}: {
  onSubmit: () => void;
  isSubmitting: boolean;
  onClose: () => void;
  children: JSX.Element;
}) => {
  return (
    <>
      <Header
        title="New Folder Settings"
        suffix={
          <>
            <Tooltip content="Cancel" side="bottom">
              <Button
                onClick={onClose}
                aria-label="Cancel"
                prefix={<ChevronDoubleLeftIcon />}
                color="ghost"
                // Tab should go:
                //   trought form fields -> create button -> cancel button
                tabIndex={3}
              />
            </Tooltip>
            <HeaderSuffixSpacer />
            <Button
              state={isSubmitting ? "pending" : "auto"}
              onClick={onSubmit}
              tabIndex={2}
            >
              {isSubmitting ? "Creating" : "Create folder"}
            </Button>
          </>
        }
      />
      <Box css={{ overflow: "auto" }}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {children}
          <input type="submit" hidden />
        </form>
      </Box>
    </>
  );
};

const updateFolder = (folderId: Folder["id"], values: Partial<Values>) => {
  serverSyncStore.createTransaction([$pages], (pages) => {
    if (pages === undefined) {
      return;
    }
    const folder = pages.folders.find((folder) => folder.id === folderId);
    if (folder === undefined) {
      return;
    }
    if (values.name !== undefined) {
      folder.name = values.name;
    }
    if (values.slug !== undefined) {
      folder.slug = values.slug;
    }
    if (values.parentFolderId !== undefined) {
      const newParentFolder = pages.folders.find(
        ({ id }) => id === values.parentFolderId
      );
      if (newParentFolder) {
        cleanupChildRefsMutable(folderId, pages);
        newParentFolder?.children.push(folderId);
      }
    }
  });
};

const deleteFolder = (folderId: Folder["id"]) => {
  // @todo ask them if they want to delete all pages as well.
  serverSyncStore.createTransaction([$pages], (pages) => {
    if (pages === undefined) {
      return;
    }
    cleanupChildRefsMutable(folderId, pages);
    removeByMutable(pages.folders, (folder) => folder.id === folderId);
  });
};

export const FolderSettings = ({
  onClose,
  onDelete,
  folderId,
}: {
  onClose: () => void;
  onDelete: () => void;
  folderId: string;
}) => {
  const pages = useStore($pages);
  const folder = pages?.folders.find(({ id }) => id === folderId);
  const [unsavedValues, setUnsavedValues] = useState<Partial<Values>>({});

  const values: Values = {
    ...(pages ? toFormValues(folderId, pages.folders) : fieldDefaultValues),
    ...unsavedValues,
  };

  const errors = validateValues(pages, values, folderId);

  const debouncedFn = useEffectEvent(() => {
    if (
      Object.keys(unsavedValues).length === 0 ||
      Object.keys(errors).length !== 0
    ) {
      return;
    }

    updateFolder(folderId, unsavedValues);

    setUnsavedValues({});
  });

  const handleSubmitDebounced = useDebouncedCallback(debouncedFn, 1000);

  const handleChange = useCallback(
    <Name extends FieldName>(event: { field: Name; value: Values[Name] }) => {
      setUnsavedValues((values) => ({
        ...values,
        [event.field]: event.value,
      }));
      handleSubmitDebounced();
    },
    [handleSubmitDebounced]
  );

  useUnmount(() => {
    if (
      Object.keys(unsavedValues).length === 0 ||
      Object.keys(errors).length !== 0
    ) {
      return;
    }
    updateFolder(folderId, unsavedValues);
  });

  const hanldeDelete = () => {
    deleteFolder(folderId);
    onDelete();
  };

  if (folder === undefined) {
    return null;
  }

  return (
    <FolderSettingsView onClose={onClose} onDelete={hanldeDelete}>
      <FormFields
        folderId={folderId}
        errors={errors}
        values={values}
        onChange={handleChange}
      />
    </FolderSettingsView>
  );
};

const FolderSettingsView = ({
  onDelete,
  onClose,
  children,
}: {
  onDelete: () => void;
  onClose: () => void;
  children: JSX.Element;
}) => {
  return (
    <>
      <Header
        title="Folder Settings"
        suffix={
          <>
            <Tooltip content="Delete folder" side="bottom">
              <Button
                color="ghost"
                prefix={<TrashIcon />}
                onClick={onDelete}
                aria-label="Delete folder"
                tabIndex={2}
              />
            </Tooltip>
            <Tooltip content="Close folder settings" side="bottom">
              <Button
                color="ghost"
                prefix={<ChevronDoubleLeftIcon />}
                onClick={onClose}
                aria-label="Close folder settings"
                tabIndex={2}
              />
            </Tooltip>
          </>
        }
      />
      <Box css={{ overflow: "auto" }}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onClose?.();
          }}
        >
          {children}
          <input type="submit" hidden />
        </form>
      </Box>
    </>
  );
};
