import { z } from "zod";
import { type FocusEventHandler, useState, useCallback, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { useDebouncedCallback } from "use-debounce";
import slugify from "slugify";
import {
  Folder,
  Pages,
  ROOT_FOLDER_ID,
  findParentFolderByChildId,
} from "@webstudio-is/sdk";
import {
  theme,
  Button,
  Label,
  InputErrorsTooltip,
  Tooltip,
  InputField,
  Grid,
  ScrollArea,
  rawTheme,
  Flex,
  Dialog,
  DialogContent,
  Text,
  DialogClose,
  DialogTitle,
  PanelTitle,
  Separator,
  TitleSuffixSpacer,
} from "@webstudio-is/design-system";
import {
  ChevronDoubleLeftIcon,
  TrashIcon,
  HelpIcon,
} from "@webstudio-is/icons";
import { useIds } from "~/shared/form-utils";
import { $pages } from "~/shared/nano-states";
import { nanoid } from "nanoid";
import { serverSyncStore } from "~/shared/sync";
import { useEffectEvent } from "~/shared/hook-utils/effect-event";
import {
  isSlugAvailable,
  registerFolderChildMutable,
  deleteFolderWithChildrenMutable,
  deletePageMutable,
} from "./page-utils";
import { Form } from "./form";
import { updateWebstudioData } from "~/shared/instance-utils";
import { useUnmount } from "~/shared/hook-utils/use-mount";

const Values = Folder.pick({ name: true, slug: true }).extend({
  parentFolderId: z.string(),
});

type Values = z.infer<typeof Values>;

type FieldName = keyof Values;

type Errors = {
  [fieldName in FieldName]?: string[];
};

const fieldDefaultValues = {
  name: "Untitled",
  slug: "untitled",
  parentFolderId: ROOT_FOLDER_ID,
} satisfies Values;

const fieldNames = Object.keys(fieldDefaultValues) as Array<FieldName>;

const validateValues = (
  pages: undefined | Pages,
  values: Values,
  folderId?: Folder["id"]
): Errors => {
  const parsedResult = Values.safeParse(values);
  const errors: Errors = {};
  if (parsedResult.success === false) {
    return parsedResult.error.formErrors.fieldErrors;
  }
  if (pages !== undefined && values.slug !== undefined) {
    if (
      isSlugAvailable(
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
    parentFolderId: parentFolder?.id ?? ROOT_FOLDER_ID,
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
            <Flex align="center" css={{ gap: theme.spacing[3] }}>
              <Label htmlFor={fieldIds.slug}>Slug</Label>
              <Tooltip
                content={"Slug will be used as part of the path to the page"}
                variant="wrapped"
              >
                <HelpIcon
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
      createFolder(folderId, values);
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
      <PanelTitle
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
            <TitleSuffixSpacer />
            <Button
              state={isSubmitting ? "pending" : "auto"}
              onClick={onSubmit}
              tabIndex={2}
            >
              {isSubmitting ? "Creating" : "Create folder"}
            </Button>
          </>
        }
      >
        New Folder Settings
      </PanelTitle>
      <Separator />
      <Form onSubmit={onSubmit}>{children}</Form>
    </>
  );
};

const createFolder = (folderId: Folder["id"], values: Values) => {
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
      registerFolderChildMutable(
        pages.folders,
        folderId,
        values.parentFolderId
      );
    }
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

  if (folder === undefined) {
    return null;
  }

  const handleDelete = () => {
    updateWebstudioData((data) => {
      const { pageIds } = deleteFolderWithChildrenMutable(
        folderId,
        data.pages.folders
      );
      pageIds.forEach((pageId) => {
        deletePageMutable(pageId, data);
      });
    });
    onDelete();
  };

  return (
    <FolderSettingsView
      folder={folder}
      onClose={onClose}
      onDelete={handleDelete}
    >
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
  folder,
}: {
  onDelete: () => void;
  onClose: () => void;
  children: JSX.Element;
  folder: Folder;
}) => {
  const [showDeleteConfirmation, setShowDeleteConfirmation] =
    useState<boolean>(false);

  const hanldeRequestDelete = () => {
    if (folder.children.length > 0) {
      setShowDeleteConfirmation(true);
      return;
    }
    onDelete();
  };

  return (
    <>
      <PanelTitle
        suffix={
          <>
            <Tooltip content="Delete folder" side="bottom">
              <Button
                color="ghost"
                prefix={<TrashIcon />}
                onClick={hanldeRequestDelete}
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
            {showDeleteConfirmation && (
              <DeleteConfirmationDialog
                folder={folder}
                onClose={() => {
                  setShowDeleteConfirmation(false);
                }}
                onConfirm={onDelete}
              />
            )}
          </>
        }
      >
        Folder Settings
      </PanelTitle>
      <Separator />
      <Form onSubmit={onClose}>{children}</Form>
    </>
  );
};

type DeleteConfirmationDialogProps = {
  onClose: () => void;
  onConfirm: () => void;
  folder: Folder;
};

const DeleteConfirmationDialog = ({
  onClose,
  onConfirm,
  folder,
}: DeleteConfirmationDialogProps) => {
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (isOpen === false) {
          onClose();
        }
      }}
    >
      <DialogContent>
        <Flex gap="3" direction="column" css={{ padding: theme.panel.padding }}>
          <Text>{`Delete folder "${folder.name}" including all of its pages?`}</Text>
          <Flex direction="rowReverse" gap="2">
            <DialogClose>
              <Button
                color="destructive"
                onClick={() => {
                  onConfirm();
                }}
              >
                Delete
              </Button>
            </DialogClose>
            <DialogClose>
              <Button color="ghost">Cancel</Button>
            </DialogClose>
          </Flex>
        </Flex>
        <DialogTitle>Delete confirmation</DialogTitle>
      </DialogContent>
    </Dialog>
  );
};
