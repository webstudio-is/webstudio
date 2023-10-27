import { z } from "zod";
import {
  useState,
  useCallback,
  type ComponentProps,
  type FocusEventHandler,
} from "react";
import { useStore } from "@nanostores/react";
import { useDebouncedCallback } from "use-debounce";
import { useUnmount } from "react-use";
import slugify from "slugify";
import {
  type Page,
  type Pages,
  PageName,
  HomePagePath,
  PageTitle,
  PagePath,
} from "@webstudio-is/sdk";
import { findPageByIdOrPath } from "@webstudio-is/project-build";
import {
  theme,
  Button,
  Box,
  Label,
  TextArea,
  InputErrorsTooltip,
  Tooltip,
  InputField,
  Grid,
  Checkbox,
  Separator,
  Text,
  IconButton,
} from "@webstudio-is/design-system";
import {
  ChevronDoubleLeftIcon,
  CopyIcon,
  TrashIcon,
  CheckMarkIcon,
  LinkIcon,
  HomeIcon,
  ImageIcon,
  DimensionsIcon,
  AspectRatioIcon,
  DeleteIcon,
} from "@webstudio-is/icons";
import { useIds } from "~/shared/form-utils";
import { Header, HeaderSuffixSpacer } from "../../header";
import { deleteInstance } from "~/shared/instance-utils";
import {
  assetsStore,
  instancesStore,
  pagesStore,
  projectStore,
  selectedInstanceSelectorStore,
  selectedPageIdStore,
} from "~/shared/nano-states";
import { nanoid } from "nanoid";
import { removeByMutable } from "~/shared/array-utils";
import { serverSyncStore } from "~/shared/sync";
import { SearchPreview } from "./search-preview";
import { ImageControl } from "~/builder/features/seo/image-control";
import { getFormattedAspectRatio } from "~/builder/shared/image-manager/utils";

const fieldDefaultValues = {
  name: "Untitled",
  path: "/untitled",
  title: "Untitled",
  description: "",
  isHomePage: false,
  excludePageFromSearch: false,
  socialImageAssetId: "",
};

const fieldNames = Object.keys(
  fieldDefaultValues
) as (keyof typeof fieldDefaultValues)[];

type FieldName = (typeof fieldNames)[number];

type Values = typeof fieldDefaultValues;

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

const toFormPage = (page: Page, isHomePage: boolean): Values => {
  return {
    ...fieldDefaultValues,
    name: page.name,
    path: page.path,
    title: page.title,
    description: page.meta.description ?? "",
    isHomePage,
  };
};

const autoSelectHandler: FocusEventHandler<HTMLInputElement> = (event) =>
  event.target.select();

const CopyPageDomainAndPathButton = ({
  pageDomainAndPath,
}: {
  pageDomainAndPath: string;
}) => {
  const [pathIconState, setPathIconState] = useState<
    "link" | "copy" | "checkmark"
  >("link");

  let pathIcon = <CopyIcon />;
  if (pathIconState === "checkmark") {
    pathIcon = <CheckMarkIcon />;
  } else if (pathIconState === "link") {
    pathIcon = <LinkIcon />;
  }

  return (
    <Tooltip
      content={pathIconState === "checkmark" ? "Copied" : "Click to copy"}
    >
      <Button
        color="ghost"
        onPointerDown={(event) => {
          navigator.clipboard.writeText("ddd");
          setPathIconState("checkmark");
          // Prevent tooltip to be closed
          event.stopPropagation();
        }}
        prefix={pathIcon}
        css={{ justifySelf: "start" }}
        onMouseEnter={() => {
          setPathIconState("copy");
        }}
        onMouseLeave={() => {
          setPathIconState("link");
        }}
      >
        {pageDomainAndPath}
      </Button>
    </Tooltip>
  );
};

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
  const assets = useStore(assetsStore);
  const asset = assets.get(values.socialImageAssetId);

  const project = projectStore.get();

  const pageDomainAndPath =
    [project?.domain, values?.path]
      .filter(Boolean)
      .join("/")
      .replace(/\/+/g, "/") +
    "dsndsnm,dnsm,dns,mndm,snd,mnsm,dns,mnd,msnd,mnsd,mnsmnms,nd,mnsdm,nsm,ndm,sndm,nsdm,nsdn";
  const pageUrl = `https://${pageDomainAndPath}`;

  return (
    <>
      <Grid gap={3} css={{ my: theme.spacing[5], mx: theme.spacing[8] }}>
        <Grid gap={1}>
          <Label htmlFor={fieldIds.name}>Page Name</Label>
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

          <Grid flow={"column"} gap={1} justify={"start"} align={"center"}>
            {values.isHomePage ? (
              <HomeIcon />
            ) : (
              <Checkbox
                id={fieldIds.isHomePage}
                onCheckedChange={() => {
                  onChange({ field: "path", value: "" });
                  onChange({ field: "isHomePage", value: !values.isHomePage });
                }}
              />
            )}

            <Label
              css={{
                overflowWrap: "anywhere",
                wordBreak: "break-all",
              }}
              htmlFor={fieldIds.isHomePage}
            >
              {values.isHomePage
                ? `“${values.name}” is the home page`
                : `Make “${values.name}” the home page`}
            </Label>
          </Grid>
          {values.isHomePage === true && (
            <>
              <div />
              <CopyPageDomainAndPathButton
                pageDomainAndPath={pageDomainAndPath}
              />
            </>
          )}
        </Grid>

        {values.isHomePage === false && (
          <Grid gap={1}>
            <Label htmlFor={fieldIds.path}>Path</Label>
            <InputErrorsTooltip errors={errors.path}>
              <InputField
                tabIndex={1}
                color={errors.path && "error"}
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
            <CopyPageDomainAndPathButton
              pageDomainAndPath={pageDomainAndPath}
            />
          </Grid>
        )}
      </Grid>

      <Separator />

      <Grid gap={2} css={{ my: theme.spacing[5], mx: theme.spacing[8] }}>
        <Grid gap={2}>
          <Label sectionTitle>Search</Label>
          <Text color="subtle">
            Optimize the way this page appears in search engine results pages.
          </Text>
          <Grid gap={1}>
            <Label>Search Result Preview</Label>
            <Box
              css={{
                padding: theme.spacing[5],
                background: theme.colors.white,
                borderRadius: theme.borderRadius[4],
                border: `1px solid ${theme.colors.borderMain}`,
              }}
            >
              <Box
                css={{
                  transformOrigin: "top left",
                  transform: "scale(0.667)",
                  width: 600,
                  height: 80,
                }}
              >
                <SearchPreview
                  siteName="NotImplemented"
                  faviconUrl="/favicon.ico"
                  pageUrl={pageUrl}
                  titleLink={values.title}
                  snippet={values.description}
                />
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Grid gap={1}>
          <Label htmlFor={fieldIds.title}>Title</Label>
          <InputErrorsTooltip errors={errors.title}>
            <InputField
              tabIndex={1}
              color={errors.title && "error"}
              id={fieldIds.title}
              name="title"
              placeholder="My awesome site - About"
              disabled={disabled}
              value={values.title}
              onChange={(event) => {
                onChange({ field: "title", value: event.target.value });
              }}
            />
          </InputErrorsTooltip>
        </Grid>

        <Grid gap={1}>
          <Label htmlFor={fieldIds.description}>Description</Label>
          <InputErrorsTooltip errors={errors.description}>
            <TextArea
              tabIndex={1}
              state={errors.description && "invalid"}
              id={fieldIds.description}
              name="description"
              disabled={disabled}
              value={values.description}
              onChange={(value) => {
                onChange({ field: "description", value });
              }}
              autoGrow
              maxRows={10}
            />
          </InputErrorsTooltip>
          <Grid flow={"column"} gap={1} justify={"start"} align={"center"}>
            <Checkbox
              id={fieldIds.isHomePage}
              onCheckedChange={() => {
                onChange({ field: "path", value: "" });
                onChange({
                  field: "excludePageFromSearch",
                  value: !values.excludePageFromSearch,
                });
              }}
            />

            <Label htmlFor={fieldIds.excludePageFromSearch}>
              Exclude this page from search results
            </Label>
          </Grid>
        </Grid>
      </Grid>
      <Separator />

      <Grid gap={2} css={{ my: theme.spacing[5], mx: theme.spacing[8] }}>
        <Label htmlFor={fieldIds.socialImageAssetId} sectionTitle>
          Social Image
        </Label>
        <Text color="subtle">
          This image appears when you share a link to this page on social media
          sites. If no image is set here, the Social Image set in the Site
          Settings will be used. The optimal dimensions for the image are
          1200x630 px or larger with a 1.91:1 aspect ratio.
        </Text>
        <Grid gap={1} flow={"column"}>
          <ImageControl
            assetId={values.socialImageAssetId}
            onAssetIdChange={(socialImageAssetId) =>
              onChange({
                field: "socialImageAssetId",
                value: socialImageAssetId,
              })
            }
          >
            <Button
              id={fieldIds.socialImageAssetId}
              css={{ justifySelf: "start" }}
              color="neutral"
            >
              Choose Image From Assets
            </Button>
          </ImageControl>
        </Grid>

        {asset?.type === "image" && (
          <Grid gap={1} flow={"column"} align={"center"} justify={"start"}>
            <Grid
              gap={2}
              flow={"column"}
              align={"center"}
              justify={"start"}
              css={{
                borderRadius: theme.borderRadius[4],
                border: `1px solid ${theme.colors.borderMain}`,
                backgroundColor: theme.colors.white,
                padding: theme.spacing[4],
                justifySelf: "start",
                pr: theme.spacing[5],
              }}
            >
              <Grid flow={"column"} gap={1} align={"center"}>
                <ImageIcon />
                <Text truncate variant={"labelsTitleCase"}>
                  {asset.name}
                </Text>
              </Grid>
              |
              <Grid flow={"column"} gap={1} align={"center"}>
                <DimensionsIcon />
                <Text variant={"labelsTitleCase"}>
                  {asset.meta.width} x {asset.meta.height} Px
                </Text>
              </Grid>
              |
              <Grid flow={"column"} gap={1} align={"center"}>
                <AspectRatioIcon />
                <Text variant={"labelsTitleCase"}>
                  {getFormattedAspectRatio(asset.meta)}
                </Text>
              </Grid>
            </Grid>
            <IconButton
              onClick={() => {
                onChange({
                  field: "socialImageAssetId",
                  value: "",
                });
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Grid>
        )}
      </Grid>
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
    ...fieldDefaultValues,
    path: nameToPath(pages, fieldDefaultValues.name),
  });
  const errors = validateValues(pages, undefined, values, false);

  const handleSubmit = () => {
    if (Object.keys(errors).length === 0) {
      const pageId = nanoid();
      serverSyncStore.createTransaction(
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
          selectedInstanceSelectorStore.set(undefined);
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
      onChange={(val) => {
        setValues((values) => {
          const changes = { [val.field]: val.value };

          if (val.field === "name") {
            if (values.path === nameToPath(pages, values.name)) {
              changes.path = nameToPath(pages, val.value);
            }
            if (values.title === values.name) {
              changes.title = val.value;
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
  serverSyncStore.createTransaction([pagesStore], (pages) => {
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
    selectedInstanceSelectorStore.set(undefined);
  }
  const rootInstanceId = pages?.pages.find(
    (page) => page.id === pageId
  )?.rootInstanceId;
  if (rootInstanceId !== undefined) {
    deleteInstance([rootInstanceId]);
  }
  serverSyncStore.createTransaction([pagesStore], (pages) => {
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
    ...(page ? toFormPage(page, isHomePage) : fieldDefaultValues),
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
      onClose={onClose}
      onDelete={hanldeDelete}
      errors={errors}
      values={values}
      onChange={handleChange}
    />
  );
};

const PageSettingsView = ({
  onDelete,
  onClose,
  ...formFieldsProps
}: {
  onDelete: () => void;
  onClose?: () => void;
} & ComponentProps<typeof FormFields>) => {
  return (
    <>
      <Header
        title="Page Settings"
        suffix={
          <>
            {formFieldsProps.values.isHomePage === false && (
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
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onClose?.();
          }}
        >
          <FormFields {...formFieldsProps} />
          <input type="submit" hidden />
        </form>
      </Box>
    </>
  );
};
