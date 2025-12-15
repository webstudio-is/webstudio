import { useState } from "react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Flex,
  Grid,
  Label,
  SmallIconButton,
  Text,
  theme,
  Tooltip,
} from "@webstudio-is/design-system";
import {
  TrashIcon,
  PlusIcon,
  InfoCircleIcon,
  AiIcon,
  AiLoadingIcon,
  ChevronDownIcon,
  AlertIcon,
} from "@webstudio-is/icons";
import { CodeEditor } from "~/builder/shared/code-editor";
import { trpcClient } from "~/shared/trpc/trpc-client";

type Script = {
  type: "application/ld+json";
  content: string;
};

type PageContext = {
  pageName: string;
  pageTitle: string;
  pageDescription?: string;
  siteName?: string;
  siteUrl?: string;
  pagePath?: string;
  contactEmail?: string;
  language?: string;
  socialImageUrl?: string;
};

type SchemaMarkupProps = {
  schemaMarkup: Script[];
  onChange: (value: Script[]) => void;
  pageContext: PageContext;
};

const defaultJsonLd = `{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "",
  "url": ""
}`;

const schemaTypes = [
  { value: "Organization", label: "Organization" },
  { value: "LocalBusiness", label: "Local Business" },
  { value: "Article", label: "Article" },
  { value: "BlogPosting", label: "Blog Posting" },
  { value: "Product", label: "Product" },
  { value: "Event", label: "Event" },
  { value: "FAQPage", label: "FAQ Page" },
  { value: "HowTo", label: "How To" },
  { value: "Person", label: "Person" },
  { value: "WebSite", label: "Web Site" },
  { value: "WebPage", label: "Web Page" },
  { value: "BreadcrumbList", label: "Breadcrumb List" },
  { value: "Review", label: "Review" },
  { value: "Recipe", label: "Recipe" },
  { value: "Course", label: "Course" },
  { value: "JobPosting", label: "Job Posting" },
  { value: "SoftwareApplication", label: "Software Application" },
  { value: "VideoObject", label: "Video Object" },
] as const;

type SchemaType = (typeof schemaTypes)[number]["value"];

const validateJsonLd = (content: string): string | undefined => {
  if (content.trim() === "") {
    return undefined;
  }
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null) {
      return "JSON-LD must be an object";
    }
    if (!parsed["@context"]) {
      return "JSON-LD should include @context";
    }
    if (!parsed["@type"]) {
      return "JSON-LD should include @type";
    }
    return undefined;
  } catch {
    return "Invalid JSON syntax";
  }
};

const getSchemaType = (content: string): string | undefined => {
  try {
    const parsed = JSON.parse(content);
    return parsed["@type"];
  } catch {
    return undefined;
  }
};

// Schema types that should only appear once per page
// These represent singular entities that don't make sense to duplicate
const singletonSchemaTypes = new Set([
  "Organization",
  "LocalBusiness",
  "WebSite",
  "WebPage",
  "Person",
  "FAQPage",
  "BreadcrumbList",
  "HowTo",
  "Course",
  "SoftwareApplication",
]);

const findDuplicateSchemaTypes = (scripts: Script[]): Map<string, number> => {
  const typeCounts = new Map<string, number>();

  for (const script of scripts) {
    const schemaType = getSchemaType(script.content);
    if (schemaType) {
      typeCounts.set(schemaType, (typeCounts.get(schemaType) ?? 0) + 1);
    }
  }

  // Return only singleton types that appear more than once
  const duplicates = new Map<string, number>();
  for (const [type, count] of typeCounts) {
    if (count > 1 && singletonSchemaTypes.has(type)) {
      duplicates.set(type, count);
    }
  }
  return duplicates;
};

const ScriptItem = (props: {
  content: string;
  onDelete: () => void;
  onChange: (content: string) => void;
}) => {
  const [localContent, setLocalContent] = useState(props.content);
  const validationError = validateJsonLd(localContent);

  return (
    <Grid
      gap={2}
      css={{
        padding: theme.spacing[4],
        borderRadius: theme.borderRadius[4],
        border: `1px solid ${validationError ? theme.colors.borderDestructiveMain : theme.colors.borderMain}`,
        background: theme.colors.backgroundPanel,
      }}
    >
      <Grid
        flow="column"
        gap={2}
        align="center"
        justify="between"
        css={{ gridTemplateColumns: "1fr auto" }}
      >
        <Label>JSON-LD Schema</Label>
        <SmallIconButton
          variant="destructive"
          icon={<TrashIcon />}
          onClick={props.onDelete}
          aria-label="Delete script"
        />
      </Grid>

      <CodeEditor
        lang="json"
        title="JSON-LD Schema"
        value={localContent}
        onChange={(value) => {
          setLocalContent(value);
        }}
        onChangeComplete={(value) => {
          setLocalContent(value);
          props.onChange(value);
        }}
      />

      {validationError && (
        <Text color="destructive" variant="small">
          {validationError}
        </Text>
      )}
    </Grid>
  );
};

const useGenerateSchema = () => {
  const { send, state, error } = trpcClient.ai.generateSchema.useMutation();
  const isLoading = state === "submitting";

  const generate = (
    schemaType: SchemaType,
    pageContext: PageContext,
    onSuccess: (content: string) => void
  ) => {
    send(
      {
        schemaType,
        pageContext: {
          pageName: pageContext.pageName,
          pageTitle: pageContext.pageTitle,
          pageDescription: pageContext.pageDescription,
          siteName: pageContext.siteName,
          siteUrl: pageContext.siteUrl,
          pagePath: pageContext.pagePath,
          contactEmail: pageContext.contactEmail,
          language: pageContext.language,
          socialImageUrl: pageContext.socialImageUrl,
        },
      },
      (generatedSchema: string) => {
        onSuccess(generatedSchema);
      }
    );
  };

  return { generate, isLoading, error };
};

const GenerateWithAiButton = ({
  isLoading,
  onSelectType,
}: {
  isLoading: boolean;
  onSelectType: (schemaType: SchemaType) => void;
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          color="gradient"
          disabled={isLoading}
          css={{
            justifySelf: "center",
          }}
          prefix={isLoading ? <AiLoadingIcon /> : <AiIcon />}
          suffix={<ChevronDownIcon />}
        >
          {isLoading ? "Generating..." : "Generate with AI"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        sideOffset={4}
        css={{
          maxHeight: 300,
          overflowY: "auto",
        }}
      >
        {schemaTypes.map(({ value, label }) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => onSelectType(value)}
            disabled={isLoading}
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const SchemaMarkup = (props: SchemaMarkupProps) => {
  const { generate, isLoading, error } = useGenerateSchema();

  const handleAiGenerate = (schemaType: SchemaType) => {
    generate(schemaType, props.pageContext, (content) => {
      const newSchemaMarkup = [
        ...props.schemaMarkup,
        { type: "application/ld+json" as const, content },
      ];
      props.onChange(newSchemaMarkup);
    });
  };

  const duplicateTypes = findDuplicateSchemaTypes(props.schemaMarkup);

  return (
    <Grid gap={2} css={{ my: theme.spacing[5], mx: theme.spacing[8] }}>
      <Grid flow="column" gap={1} justify="start" align="center">
        <Label text="title">Schema Markup</Label>
        <Tooltip
          variant="wrapped"
          content={
            <Text>
              Add JSON-LD structured data to help search engines understand your
              page content. This can improve SEO and enable rich results in
              search.{" "}
              <Text
                as="a"
                href="https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data"
                target="_blank"
                rel="noopener noreferrer"
                css={{ color: "inherit", textDecoration: "underline" }}
              >
                Learn more
              </Text>
            </Text>
          }
        >
          <InfoCircleIcon tabIndex={0} />
        </Tooltip>
      </Grid>
      <Text color="subtle">
        Add structured data using JSON-LD format to improve how search engines
        and AI tools understand your page content. Use AI to generate schemas or
        add them manually.
      </Text>

      {duplicateTypes.size > 0 && (
        <Flex
          gap={2}
          align="start"
          css={{
            padding: theme.spacing[5],
            borderRadius: theme.borderRadius[4],
            background: theme.colors.backgroundAlertNotification,
            border: `1px solid ${theme.colors.backgroundAlertMain}`,
          }}
        >
          <AlertIcon
            color={theme.colors.backgroundAlertMain}
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <Text variant="small">
            <Text variant="small" as="span" css={{ fontWeight: 600 }}>
              Duplicate schema types detected:
            </Text>{" "}
            {Array.from(duplicateTypes.entries())
              .map(([type, count]) => `${type} (${count}×)`)
              .join(", ")}
            . Having multiple schemas of the same type on one page may confuse
            search engines.
          </Text>
        </Flex>
      )}

      {error && (
        <Text color="destructive" variant="small">
          {error}
        </Text>
      )}

      <Grid gap={3}>
        {props.schemaMarkup.map((script, index) => (
          <ScriptItem
            key={index}
            content={script.content}
            onChange={(content) => {
              const newSchemaMarkup = [...props.schemaMarkup];
              newSchemaMarkup[index] = {
                type: "application/ld+json",
                content,
              };
              props.onChange(newSchemaMarkup);
            }}
            onDelete={() => {
              const newSchemaMarkup = [...props.schemaMarkup];
              newSchemaMarkup.splice(index, 1);
              props.onChange(newSchemaMarkup);
            }}
          />
        ))}

        <Grid flow="column" gap={2} justify="center" align="center">
          <GenerateWithAiButton
            isLoading={isLoading}
            onSelectType={handleAiGenerate}
          />
          <Button
            type="button"
            color="neutral"
            prefix={<PlusIcon />}
            onClick={() => {
              const newSchemaMarkup = [
                ...props.schemaMarkup,
                {
                  type: "application/ld+json" as const,
                  content: defaultJsonLd,
                },
              ];
              props.onChange(newSchemaMarkup);
            }}
          >
            Add manually
          </Button>
        </Grid>
      </Grid>
    </Grid>
  );
};
