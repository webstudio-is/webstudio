import { z } from "zod";
import { type FocusEventHandler, useState, useCallback } from "react";
import { useStore } from "@nanostores/react";
import { useDebouncedCallback } from "use-debounce";
import { useUnmount } from "react-use";
import slugify from "slugify";
import { Folder, FolderName, FolderSlug, Folders } from "@webstudio-is/sdk";
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
} from "@webstudio-is/design-system";
import {
  ChevronDoubleLeftIcon,
  TrashIcon,
  HelpIcon,
} from "@webstudio-is/icons";
import { useIds } from "~/shared/form-utils";
import { Header, HeaderSuffixSpacer } from "../../header";
import { $folders } from "~/shared/nano-states";
import { nanoid } from "nanoid";
import { serverSyncStore } from "~/shared/sync";
import { useEffectEvent } from "~/builder/features/ai/hooks/effect-event";
import { addFolderChild } from "./page-utils";

const fieldDefaultValues = {
  name: "Untitled",
  slug: "untitled",
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

const isSlugUnique = (
  folders: Folders,
  // undefined page id means new page
  folderId: undefined | Folder["id"],
  slug: string
) => {
  // @todo we need to validate if this folder is unique within its parent
  //const list = [];
  //const set = new Set();
  //list.push(path);
  //set.add(path);
  //for (const page of pages.pages) {
  //  if (page.id !== folderId) {
  //    list.push(page.path);
  //    set.add(page.path);
  //  }
  //}
  //return list.length === set.size;
  return true;
};

const validateValues = (
  folders: undefined | Folders,
  // undefined folder id means new folder
  folderId: undefined | Folder["id"],
  values: Values
): Errors => {
  const parsedResult = FolderValues.safeParse(values);
  const errors: Errors = {};
  if (parsedResult.success === false) {
    return parsedResult.error.formErrors.fieldErrors;
  }
  if (folders !== undefined && values.slug !== undefined) {
    if (isSlugUnique(folders, folderId, values.slug) === false) {
      errors.slug = errors.slug ?? [];
      errors.slug.push("Slug needs to be unique within a folder");
    }
  }
  return errors;
};

const toForm = (folder: Folder): Values => {
  return {
    name: folder.name,
    slug: folder.slug,
  };
};

const autoSelectHandler: FocusEventHandler<HTMLInputElement> = (event) =>
  event.target.select();

const FormFields = ({
  disabled,
  autoSelect,
  errors,
  values,
  onChange,
}: {
  disabled?: boolean;
  autoSelect?: boolean;
  errors: Errors;
  values: Values;
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
                  onChange({ field: "slug", value: event.target.value });
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

export const NewFolderSettings = ({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (folderId: Folder["id"]) => void;
}) => {
  const folders = useStore($folders);

  const [values, setValues] = useState<Values>({
    ...fieldDefaultValues,
    slug: nameToSlug(fieldDefaultValues.name),
  });
  const errors = validateValues(folders, undefined, values);
  const handleSubmit = () => {
    if (Object.keys(errors).length === 0) {
      const folderId = nanoid();

      serverSyncStore.createTransaction([$folders], (folders) => {
        folders.set(folderId, {
          id: folderId,
          name: values.name,
          slug: values.slug,
          children: [],
        });
        addFolderChild(folders, folderId);
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
  serverSyncStore.createTransaction([$folders], (folders) => {
    const folder = folders.get(folderId);
    if (folder === undefined) {
      return;
    }
    if (values.name !== undefined) {
      folder.name = values.name;
    }
    if (values.slug !== undefined) {
      folder.slug = values.slug;
    }
  });
};

const deleteFolder = (folderId: Folder["id"]) => {
  // @todo ask them if they want to delete all pages as well.
  serverSyncStore.createTransaction([$folders], (folders) => {
    folders?.delete(folderId);
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
  const folders = useStore($folders);
  const folder = folders.get(folderId);
  const [unsavedValues, setUnsavedValues] = useState<Partial<Values>>({});

  const values: Values = {
    ...(folder ? toForm(folder) : fieldDefaultValues),
    ...unsavedValues,
  };

  const errors = validateValues(folders, folderId, values);

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
      <FormFields errors={errors} values={values} onChange={handleChange} />
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
