import { useStore } from "@nanostores/react";
import {
  Button,
  DialogClose,
  DialogTitle,
  Flex,
  Grid,
  InputErrorsTooltip,
  InputField,
  Label,
  DialogTitleActions,
  ScrollArea,
  TitleSuffixSpacer,
  Tooltip,
  rawTheme,
  theme,
} from "@webstudio-is/design-system";
import { InfoCircleIcon, TrashIcon } from "@webstudio-is/icons";
import { type Folder, getFolderById } from "@webstudio-is/sdk";
import {
  folderSettingsDefaultValues,
  getFolderSettingsValues,
  getNewFolderSettingsValues,
  nameToSlug,
  validateFolderSettings,
  type FolderSettingsFieldErrors,
  type FolderSettingsValues,
} from "@webstudio-is/project-build/runtime";
import { useState, type FocusEventHandler } from "react";
import { useIds } from "~/shared/form-utils";
import { $pages } from "~/shared/sync/data-stores";
import { $isDesignMode } from "~/shared/nano-states";
import { Form } from "./form";
import { useDraftValue } from "~/builder/shared/use-draft-value";
import { copyFolder } from "~/shared/copy-paste/copy-paste";
import { PageItemActionsDropdown } from "./page-item-actions";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";

type Values = FolderSettingsValues;

type FieldName = keyof Values;

type Errors = FolderSettingsFieldErrors;

const emptyUnsavedValues: Partial<Values> = {};

const fieldNames = Object.keys(folderSettingsDefaultValues) as Array<FieldName>;

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

  return (
    <Grid css={{ height: "100%" }}>
      <ScrollArea>
        <Grid gap={3} css={{ padding: theme.panel.padding }}>
          <Grid gap={1}>
            <Label htmlFor={fieldIds.name}>Folder name</Label>
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
            <Flex align="center" css={{ gap: theme.spacing[3] }}>
              <Label htmlFor={fieldIds.slug}>Slug</Label>
              <Tooltip
                content={"Slug will be used as part of the path to the page"}
                variant="wrapped"
              >
                <InfoCircleIcon
                  color={rawTheme.colors.foregroundSubtle}
                  tabIndex={0}
                />
              </Tooltip>
            </Flex>
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

export const newFolderId = "new-folder";

export const NewFolderSettings = ({
  onClose: _onClose,
  onSuccess,
  onRequestDelete,
}: {
  onClose: () => void;
  onSuccess: (folderId: Folder["id"]) => void;
  onRequestDelete?: () => void;
}) => {
  const pages = useStore($pages);
  const isDesignMode = useStore($isDesignMode);

  const [values, setValues] = useState<Values>(() =>
    getNewFolderSettingsValues(pages)
  );

  const errors = validateFolderSettings({ pages, values });

  const handleSubmit = () => {
    if (Object.keys(errors).length === 0) {
      const folderId = createFolder(values);
      if (folderId !== undefined) {
        onSuccess(folderId);
      }
    }
  };

  const handleRequestDelete = () => {
    if (onRequestDelete) {
      onRequestDelete();
    }
  };

  const isSubmitting = false;

  return (
    <>
      <DialogTitle
        suffix={
          <DialogTitleActions>
            {isDesignMode && onRequestDelete && (
              <Tooltip content="Delete folder" side="bottom">
                <Button
                  color="ghost"
                  prefix={<TrashIcon />}
                  onClick={handleRequestDelete}
                  aria-label="Delete folder"
                  tabIndex={2}
                />
              </Tooltip>
            )}
            <TitleSuffixSpacer />
            <Button
              state={isSubmitting ? "pending" : "auto"}
              onClick={handleSubmit}
              tabIndex={2}
            >
              {isSubmitting ? "Creating" : "Create folder"}
            </Button>
            <DialogClose />
          </DialogTitleActions>
        }
      >
        New folder settings
      </DialogTitle>
      <Form onSubmit={handleSubmit}>
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
      </Form>
    </>
  );
};

const createFolder = (values: Values) => {
  const result = executeRuntimeMutation({
    id: "folders.create",
    input: {
      name: values.name,
      slug: values.slug,
      parentFolderId: values.parentFolderId,
    },
  });
  return result?.result.folderId as string | undefined;
};

const updateFolder = (folderId: Folder["id"], values: Partial<Values>) => {
  executeRuntimeMutation({
    id: "folders.update",
    input: {
      folderId,
      values,
    },
  });
};

export const FolderSettings = ({
  onClose,
  onRequestDelete,
  onDuplicate,
  folderId,
}: {
  onClose: () => void;
  onRequestDelete?: () => void;
  onDuplicate?: (newFolderId: string) => void;
  folderId: string;
}) => {
  const pages = useStore($pages);
  const folder =
    pages === undefined ? undefined : getFolderById(pages, folderId);
  const isDesignMode = useStore($isDesignMode);

  let errors: Errors = {};
  const { value: unsavedValues, set: setUnsavedValues } = useDraftValue<
    Partial<Values>
  >(
    emptyUnsavedValues,
    (values) => {
      updateFolder(folderId, values);
    },
    {
      resetOnSave: true,
      shouldSave: () => Object.keys(errors).length === 0,
    }
  );

  const handleChange = <Name extends FieldName>(event: {
    field: Name;
    value: Values[Name];
  }) => {
    setUnsavedValues((values) => ({
      ...values,
      [event.field]: event.value,
    }));
  };

  const values: Values = {
    ...(pages
      ? getFolderSettingsValues({ folderId, pages })
      : folderSettingsDefaultValues),
    ...unsavedValues,
  };

  errors = validateFolderSettings({ pages, values, folderId });

  if (folder === undefined) {
    return null;
  }

  const handleRequestDelete = () => {
    if (onRequestDelete) {
      onRequestDelete();
    }
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(folderId);
    }
  };

  const handleCopy = () => {
    void copyFolder(folderId);
  };

  return (
    <>
      <DialogTitle
        suffix={
          <DialogTitleActions>
            {isDesignMode && (
              <PageItemActionsDropdown
                label="Folder actions"
                actions={{
                  copy: handleCopy,
                  duplicate: onDuplicate ? handleDuplicate : undefined,
                  delete: onRequestDelete ? handleRequestDelete : undefined,
                }}
              />
            )}
            <DialogClose />
          </DialogTitleActions>
        }
      >
        Folder settings
      </DialogTitle>
      <Form onSubmit={onClose}>
        <FormFields
          folderId={folderId}
          errors={errors}
          values={values}
          onChange={handleChange}
        />
      </Form>
    </>
  );
};
