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
import { InfoCircleIcon, TrashIcon, CopyIcon } from "@webstudio-is/icons";
import {
  Folder,
  Pages,
  ROOT_FOLDER_ID,
  findParentFolderByChildId,
} from "@webstudio-is/sdk";
import { nanoid } from "nanoid";
import { useCallback, useState, type FocusEventHandler } from "react";
import slugify from "slugify";
import { useDebouncedCallback } from "use-debounce";
import { z } from "zod";
import { useIds } from "~/shared/form-utils";
import { useEffectEvent } from "~/shared/hook-utils/effect-event";
import { useUnmount } from "~/shared/hook-utils/use-mount";
import { $pages } from "~/shared/sync/data-stores";
import { $isDesignMode } from "~/shared/nano-states";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import { Form } from "./form";
import { isSlugAvailable, registerFolderChildMutable } from "./page-utils";

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

const nameToSlug = (name: string) => {
  if (name === "") {
    return "";
  }

  return slugify(name, { lower: true, strict: true });
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
        New Folder Settings
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
  const folder = pages?.folders.find(({ id }) => id === folderId);
  const [unsavedValues, setUnsavedValues] = useState<Partial<Values>>({});
  const isDesignMode = useStore($isDesignMode);

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
            {isDesignMode && onDuplicate && (
              <Tooltip content="Duplicate folder" side="bottom">
                <Button
                  color="ghost"
                  prefix={<CopyIcon />}
                  onClick={handleDuplicate}
                  aria-label="Duplicate folder"
                  tabIndex={2}
                />
              </Tooltip>
            )}
            <DialogClose />
          </DialogTitleActions>
        }
      >
        Folder Settings
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
