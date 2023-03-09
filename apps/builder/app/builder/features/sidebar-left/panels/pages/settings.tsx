import type { ZodError } from "zod";
import { useState, useCallback, ComponentProps } from "react";
import { useDebouncedCallback } from "use-debounce";
import { useUnmount } from "react-use";
import slugify from "slugify";
import { useFetcher } from "@remix-run/react";
import {
  type Page,
  type Pages,
  findPageByIdOrPath,
} from "@webstudio-is/project-build";
import {
  theme,
  Button,
  Box,
  DeprecatedLabel,
  TextArea,
  TextField,
  styled,
  Flex,
  InputErrorsTooltip,
  Tooltip,
} from "@webstudio-is/design-system";
import { ChevronDoubleLeftIcon, TrashIcon } from "@webstudio-is/icons";
import { usePages } from "~/builder/shared/nano-states";
import { useOnFetchEnd, usePersistentFetcher } from "~/shared/fetcher";
import {
  normalizeErrors,
  toastUnknownFieldErrors,
  useIds,
  useFetcherErrors,
} from "~/shared/form-utils";
import type {
  DeletePageData,
  EditPageData,
  CreatePageData,
} from "~/shared/pages";
import { restPagesPath } from "~/shared/router-utils";
import { Header, HeaderSuffixSpacer } from "../../header";
import { deleteInstance } from "~/shared/instance-utils";

const Group = styled(Flex, {
  marginBottom: theme.spacing[9],
  gap: theme.spacing[4],
  defaultVariants: { direction: "column" },
});

const fieldNames = ["name", "path", "title", "description"] as const;
type FieldName = (typeof fieldNames)[number];
type FormPage = Pick<Page, "name" | "path" | "title"> & {
  description: string;
};

const toFormPage = (page: Page): FormPage => {
  return {
    name: page.name,
    path: page.path,
    title: page.title,
    description: page.meta.description ?? "",
  };
};

const autoSelectHandler = (event: React.FocusEvent<HTMLInputElement>) =>
  event.target.select();

const FormFields = ({
  disabled,
  autoSelect,
  isHomePage,
  values,
  onChange,
  fieldErrors,
}: {
  disabled?: boolean;
  autoSelect?: boolean;
  isHomePage?: boolean;
  values: FormPage;
  onChange: <Name extends FieldName>(event: {
    field: Name;
    value: FormPage[Name];
  }) => void;
  fieldErrors: ZodError["formErrors"]["fieldErrors"];
}) => {
  const fieldIds = useIds(fieldNames);

  return (
    <>
      <Group>
        <DeprecatedLabel htmlFor={fieldIds.name}>Page Name</DeprecatedLabel>
        <InputErrorsTooltip errors={fieldErrors.name}>
          <TextField
            tabIndex={1}
            state={fieldErrors.name && "invalid"}
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
          <InputErrorsTooltip errors={fieldErrors.path}>
            <TextField
              tabIndex={1}
              state={fieldErrors.path && "invalid"}
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
        <InputErrorsTooltip errors={fieldErrors.title}>
          <TextField
            tabIndex={1}
            state={fieldErrors.title && "invalid"}
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
        <InputErrorsTooltip errors={fieldErrors.description}>
          <TextArea
            tabIndex={1}
            state={fieldErrors.description && "invalid"}
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
  projectId,
}: {
  onClose?: () => void;
  onSuccess?: (page: Page) => void;
  projectId: string;
}) => {
  const [pages] = usePages();

  const fetcher = useFetcher<CreatePageData>();

  useOnFetchEnd(fetcher, (data) => {
    if (data.status === "ok") {
      onSuccess?.(data.page);
    }
  });

  const isSubmitting = fetcher.state !== "idle";

  const { fieldErrors, resetFieldError } = useFetcherErrors({
    fetcher,
    fieldNames,
  });

  const [values, setValues] = useState<FormPage>({
    name: "Untitled",
    path: nameToPath(pages, "Untitled"),
    title: "Untitled",
    description: "",
  });

  const handleSubmit = () => {
    fetcher.submit(values, {
      method: "put",
      action: restPagesPath({ projectId }),
    });
  };

  return (
    <NewPageSettingsView
      onSubmit={handleSubmit}
      onClose={onClose}
      isSubmitting={isSubmitting}
      fieldErrors={fieldErrors}
      disabled={isSubmitting}
      values={values}
      onChange={({ field, value }) => {
        resetFieldError(field);
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

const toFormData = (page: Partial<FormPage> & { id: string }): FormData => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(page)) {
    // @todo: handle "meta"
    if (typeof value === "string") {
      formData.append(key, value);
    }
  }
  return formData;
};

export const PageSettings = ({
  onClose,
  onDelete,
  pageId,
  projectId,
}: {
  onClose?: () => void;
  onDelete?: () => void;
  pageId: string;
  projectId: string;
}) => {
  const submitPersistently = usePersistentFetcher();

  const fetcher = useFetcher<EditPageData>();

  const [pages, setPages] = usePages();
  const page = pages && findPageByIdOrPath(pages, pageId);

  // Updating client side store like that is a temporary solution
  // We want to switch pages to immerhin: https://github.com/webstudio-is/webstudio-builder/issues/1084
  const updateOnClient = (page: Page) => {
    if (pages === undefined) {
      return;
    }
    if (pages.homePage.id === page.id) {
      setPages({ homePage: page, pages: pages.pages });
      return;
    }
    setPages({
      homePage: pages.homePage,
      pages: pages.pages.map((item) => (item.id === page.id ? page : item)),
    });
  };
  const deleteOnClient = (pageId: Page["id"]) => {
    if (pages === undefined) {
      return;
    }
    const page = pages.pages.find((item) => item.id === pageId);
    if (page) {
      deleteInstance(page.rootInstanceId);
    }
    setPages({
      homePage: pages.homePage,
      pages: pages.pages.filter((item) => item.id !== pageId),
    });
  };

  const isHomePage = page?.id === pages?.homePage.id;

  const [unsavedValues, setUnsavedValues] = useState<Partial<FormPage>>({});
  const [submittedValues, setSubmittedValues] = useState<Partial<FormPage>>({});

  const { fieldErrors, resetFieldError } = useFetcherErrors({
    fetcher,
    fieldNames: isHomePage
      ? fieldNames.filter((name) => name !== "path")
      : fieldNames,
  });

  const handleSubmitDebounced = useDebouncedCallback(() => {
    if (Object.keys(unsavedValues).length === 0) {
      return;
    }

    // We're re-submitting the submittedValues because previous submit is going to be cancelled
    // (normally, submittedValues are empty at this point)
    const valuesToSubmit = { ...submittedValues, ...unsavedValues };

    fetcher.submit(toFormData({ id: pageId, ...valuesToSubmit }), {
      method: "post",
      action: restPagesPath({ projectId }),
    });

    setSubmittedValues(valuesToSubmit);
    setUnsavedValues({});
  }, 1000);

  const handleChange = useCallback(
    <Name extends FieldName>(event: { field: Name; value: FormPage[Name] }) => {
      resetFieldError(event.field);
      setUnsavedValues((values) => ({ ...values, [event.field]: event.value }));
      handleSubmitDebounced();
    },
    [handleSubmitDebounced, resetFieldError]
  );

  useUnmount(() => {
    if (Object.keys(unsavedValues).length === 0) {
      return;
    }
    // We use submitPersistently instead of fetcher.submit
    // because we don't want the request to be canceled when the component unmounts
    submitPersistently<EditPageData>(
      toFormData({ id: pageId, ...submittedValues, ...unsavedValues }),
      { method: "post", action: restPagesPath({ projectId }) },
      (data) => {
        if (data.status === "error") {
          toastUnknownFieldErrors(normalizeErrors(data.errors), []);
        } else {
          updateOnClient(data.page);
        }
      }
    );
  });

  useOnFetchEnd(fetcher, (data) => {
    if (data.status === "error") {
      setUnsavedValues({ ...submittedValues, ...unsavedValues });
    } else {
      updateOnClient(data.page);
    }
    setSubmittedValues({});
  });

  const hanldeDelete = () => {
    // We use submitPersistently instead of fetcher.submit
    // because we don't want the request to be canceled when the component unmounts
    submitPersistently<DeletePageData>(
      { id: pageId },
      { method: "delete", action: restPagesPath({ projectId }) },
      (data) => {
        if (data.status === "error") {
          toastUnknownFieldErrors(normalizeErrors(data.errors), []);
        } else {
          deleteOnClient(pageId);
        }
      }
    );
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
      fieldErrors={fieldErrors}
      values={{ ...toFormPage(page), ...submittedValues, ...unsavedValues }}
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
