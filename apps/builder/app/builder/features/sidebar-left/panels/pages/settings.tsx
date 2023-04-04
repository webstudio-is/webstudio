import { z } from "zod";
import store from "immerhin";
import { useState, useCallback, type ComponentProps } from "react";
import { useStore } from "@nanostores/react";
import { useDebouncedCallback } from "use-debounce";
import { useUnmount } from "react-use";
import slugify from "slugify";
import {
  type Page,
  type Pages,
  findPageByIdOrPath,
  PageName,
  HomePagePath,
  PageTitle,
  PagePath,
} from "@webstudio-is/project-build";
import {
  theme,
  Button,
  Box,
  DeprecatedLabel,
  TextArea,
  DeprecatedTextField,
  styled,
  Flex,
  InputErrorsTooltip,
  Tooltip,
} from "@webstudio-is/design-system";
import { ChevronDoubleLeftIcon, TrashIcon } from "@webstudio-is/icons";
import { useIds } from "~/shared/form-utils";
import { Header, HeaderSuffixSpacer } from "../../header";
import { deleteInstance } from "~/shared/instance-utils";
import {
  instancesStore,
  pagesStore,
  selectedPageIdStore,
} from "~/shared/nano-states";
import { nanoid } from "nanoid";
import { removeByMutable } from "~/shared/array-utils";

const Group = styled(Flex, {
  marginBottom: theme.spacing[9],
  gap: theme.spacing[4],
  defaultVariants: { direction: "column" },
});

const fieldNames = ["name", "path", "title", "description"] as const;
type FieldName = (typeof fieldNames)[number];
type Values = {
  [fieldName in FieldName]: string;
};
type Errors = {
  [fieldName in FieldName]?: string[];
};

const HomePageValues = z.object({
  name: PageName,
  path: HomePagePath,
  title: PageTitle,
  description: z.string().optional(),
});

const PageValues = z.object({
  name: PageName,
  path: PagePath,
  title: PageTitle,
  description: z.string().optional(),
});

const isPathUnique = (
  pages: Pages,
  // undefined page id means new page
  pageId: undefined | Page["id"],
  path: string
) => {
  const list = [];
  const set = new Set();
  list.push(path);
  set.add(path);
  for (const page of pages.pages) {
    if (page.id !== pageId) {
      list.push(page.path);
      set.add(page.path);
    }
  }
  return list.length === set.size;
};

const validateValues = (
  pages: undefined | Pages,
  // undefined page id means new page
  pageId: undefined | Page["id"],
  values: Values,
  isHomePage: boolean
): Errors => {
  const Validator = isHomePage ? HomePageValues : PageValues;
  const parsedResult = Validator.safeParse(values);
  const errors: Errors = {};
  if (parsedResult.success === false) {
    return parsedResult.error.formErrors.fieldErrors;
  }
  if (
    pages !== undefined &&
    values.path !== undefined &&
    isPathUnique(pages, pageId, values.path) === false
  ) {
    errors.path = errors.path ?? [];
    errors.path.push("All paths must be unique");
  }
  return errors;
};

const toFormPage = (page?: Page): Values => {
  return {
    name: page?.name ?? "",
    path: page?.path ?? "",
    title: page?.title ?? "",
    description: page?.meta.description ?? "",
  };
};

const autoSelectHandler = (event: React.FocusEvent<HTMLInputElement>) =>
  event.target.select();

const FormFields = ({
  disabled,
  autoSelect,
  isHomePage,
  errors,
  values,
  onChange,
}: {
  disabled?: boolean;
  autoSelect?: boolean;
  isHomePage?: boolean;
  errors: Errors;
  values: Values;
  onChange: <Name extends FieldName>(event: {
    field: Name;
    value: Values[Name];
  }) => void;
}) => {
  const fieldIds = useIds(fieldNames);

  return (
    <>
      <Group>
        <DeprecatedLabel htmlFor={fieldIds.name}>Page Name</DeprecatedLabel>
        <InputErrorsTooltip errors={errors.name}>
          <DeprecatedTextField
            tabIndex={1}
            state={errors.name && "invalid"}
            id={fieldIds.name}
            autoFocus
            onFocus={autoSelect ? autoSelectHandler : undefined}
            name="name"
            placeholder="About"
            disabled={disabled}
            value={values?.name}
            onChange={(event) => {
              onChange({ field: "name", value: event.target.value });
            }}
          />
        </InputErrorsTooltip>
      </Group>
      {isHomePage !== true && (
        <Group>
          <DeprecatedLabel htmlFor={fieldIds.path}>Path</DeprecatedLabel>
          <InputErrorsTooltip errors={errors.path}>
            <DeprecatedTextField
              tabIndex={1}
              state={errors.path && "invalid"}
              id={fieldIds.path}
              name="path"
              placeholder="/about"
              disabled={disabled}
              value={values?.path}
              onChange={(event) => {
                onChange({ field: "path", value: event.target.value });
              }}
            />
          </InputErrorsTooltip>
        </Group>
      )}
      <Group>
        <DeprecatedLabel htmlFor={fieldIds.title}>Title</DeprecatedLabel>
        <InputErrorsTooltip errors={errors.title}>
          <DeprecatedTextField
            tabIndex={1}
            state={errors.title && "invalid"}
            id={fieldIds.title}
            name="title"
            placeholder="My awesome site - About"
            disabled={disabled}
            value={values?.title}
            onChange={(event) => {
              onChange({ field: "title", value: event.target.value });
            }}
          />
        </InputErrorsTooltip>
      </Group>
      <Group>
        <DeprecatedLabel htmlFor={fieldIds.description}>
          Description
        </DeprecatedLabel>
        <InputErrorsTooltip errors={errors.description}>
          <TextArea
            tabIndex={1}
            state={errors.description && "invalid"}
            id={fieldIds.description}
            name="description"
            disabled={disabled}
            value={values?.description}
            onChange={(event) => {
              onChange({ field: "description", value: event.target.value });
            }}
          />
        </InputErrorsTooltip>
      </Group>
    </>
  );
};

const nameToPath = (pages: Pages | undefined, name: string) => {
  if (name === "") {
    return "";
  }

  const slug = slugify(name, { lower: true, strict: true });
  const path = `/${slug}`;

  // for TypeScript
  if (pages === undefined) {
    return path;
  }

  if (findPageByIdOrPath(pages, path) === undefined) {
    return path;
  }

  let suffix = 1;

  while (findPageByIdOrPath(pages, `${path}${suffix}`) !== undefined) {
    suffix++;
  }

  return `${path}${suffix}`;
};

export const NewPageSettings = ({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (pageId: Page["id"]) => void;
}) => {
  const pages = useStore(pagesStore);

  const [values, setValues] = useState<Values>({
    name: "Untitled",
    path: nameToPath(pages, "Untitled"),
    title: "Untitled",
    description: "",
  });
  const errors = validateValues(pages, undefined, values, false);

  const handleSubmit = () => {
    if (Object.keys(errors).length === 0) {
      const pageId = nanoid();
      store.createTransaction(
        [pagesStore, instancesStore],
        (pages, instances) => {
          if (pages === undefined) {
            return;
          }
          const rootInstanceId = nanoid();
          pages.pages.push({
            id: pageId,
            name: values.name,
            path: values.path,
            title: values.title,
            rootInstanceId,
            meta: {
              description: values.description,
            },
          });
          instances.set(rootInstanceId, {
            type: "instance",
            id: rootInstanceId,
            component: "Body",
            children: [],
          });
        }
      );
      onSuccess(pageId);
    }
  };

  return (
    <NewPageSettingsView
      onSubmit={handleSubmit}
      onClose={onClose}
      isSubmitting={false}
      errors={errors}
      disabled={false}
      values={values}
      onChange={({ field, value }) => {
        setValues((values) => {
          const changes = { [field]: value };
          if (field === "name") {
            if (values.path === nameToPath(pages, values.name)) {
              changes.path = nameToPath(pages, value);
            }
            if (values.title === values.name) {
              changes.title = value;
            }
          }
          return { ...values, ...changes };
        });
      }}
    />
  );
};

const NewPageSettingsView = ({
  onSubmit,
  isSubmitting,
  onClose,
  ...formFieldsProps
}: {
  onSubmit: () => void;
  isSubmitting: boolean;
  onClose?: () => void;
} & ComponentProps<typeof FormFields>) => {
  return (
    <>
      <Header
        title="New Page Settings"
        suffix={
          <>
            {onClose && (
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
            )}
            <HeaderSuffixSpacer />
            <Button
              state={isSubmitting ? "pending" : "auto"}
              onClick={onSubmit}
              tabIndex={2}
            >
              {isSubmitting ? "Creating" : "Create page"}
            </Button>
          </>
        }
      />
      <Box
        css={{
          overflow: "auto",
          padding: `${theme.spacing[5]} ${theme.spacing[9]}`,
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <FormFields autoSelect {...formFieldsProps} />
          <input type="submit" hidden />
        </form>
      </Box>
    </>
  );
};

const updatePage = (pageId: Page["id"], values: Partial<Values>) => {
  const updatePageMutable = (page: Page, values: Partial<Values>) => {
    if (values.name !== undefined) {
      page.name = values.name;
    }
    if (values.path !== undefined) {
      page.path = values.path;
    }
    if (values.title !== undefined) {
      page.title = values.title;
    }
    if (values.description !== undefined) {
      page.meta.description = values.description;
    }
  };
  store.createTransaction([pagesStore], (pages) => {
    if (pages === undefined) {
      return;
    }
    if (pages.homePage.id === pageId) {
      updatePageMutable(pages.homePage, values);
    }
    for (const page of pages.pages) {
      if (page.id === pageId) {
        updatePageMutable(page, values);
      }
    }
  });
};

const deletePage = (pageId: Page["id"]) => {
  const pages = pagesStore.get();
  // deselect page before deleting to avoid flash of content
  if (selectedPageIdStore.get() === pageId) {
    selectedPageIdStore.set(pages?.homePage.id);
  }
  const rootInstanceId = pages?.pages.find(
    (page) => page.id === pageId
  )?.rootInstanceId;
  if (rootInstanceId !== undefined) {
    deleteInstance([rootInstanceId]);
  }
  store.createTransaction([pagesStore], (pages) => {
    if (pages === undefined) {
      return;
    }
    removeByMutable(pages.pages, (page) => page.id === pageId);
  });
};

export const PageSettings = ({
  onClose,
  onDelete,
  pageId,
}: {
  onClose?: () => void;
  onDelete?: () => void;
  pageId: string;
}) => {
  const pages = useStore(pagesStore);
  const page = pages && findPageByIdOrPath(pages, pageId);

  const isHomePage = page?.id === pages?.homePage.id;

  const [unsavedValues, setUnsavedValues] = useState<Partial<Values>>({});

  const values: Values = {
    ...toFormPage(page),
    ...unsavedValues,
  };
  const errors = validateValues(pages, pageId, values, isHomePage);

  const handleSubmitDebounced = useDebouncedCallback(() => {
    if (
      Object.keys(unsavedValues).length === 0 ||
      Object.keys(errors).length !== 0
    ) {
      return;
    }
    updatePage(pageId, unsavedValues);
    setUnsavedValues({});
  }, 1000);

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
    updatePage(pageId, unsavedValues);
  });

  const hanldeDelete = () => {
    deletePage(pageId);
    onDelete?.();
  };

  if (page === undefined) {
    return null;
  }

  return (
    <PageSettingsView
      isHomePage={isHomePage}
      onClose={onClose}
      onDelete={hanldeDelete}
      errors={errors}
      values={values}
      onChange={handleChange}
    />
  );
};

const PageSettingsView = ({
  isHomePage,
  onDelete,
  onClose,
  ...formFieldsProps
}: {
  isHomePage: boolean;
  onDelete: () => void;
  onClose?: () => void;
} & ComponentProps<typeof FormFields>) => {
  return (
    <>
      <Header
        title="Page Settings"
        suffix={
          <>
            {isHomePage === false && (
              <Tooltip content="Delete page" side="bottom">
                <Button
                  color="ghost"
                  prefix={<TrashIcon />}
                  onClick={onDelete}
                  aria-label="Delete page"
                  tabIndex={2}
                />
              </Tooltip>
            )}
            {onClose && (
              <Tooltip content="Close page settings" side="bottom">
                <Button
                  color="ghost"
                  prefix={<ChevronDoubleLeftIcon />}
                  onClick={onClose}
                  aria-label="Close page settings"
                  tabIndex={2}
                />
              </Tooltip>
            )}
          </>
        }
      />
      <Box
        css={{
          overflow: "auto",
          padding: `${theme.spacing[5]} ${theme.spacing[9]}`,
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onClose?.();
          }}
        >
          <FormFields isHomePage={isHomePage} {...formFieldsProps} />
          <input type="submit" hidden />
        </form>
      </Box>
    </>
  );
};
