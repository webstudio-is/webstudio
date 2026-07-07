import {
  Flex,
  Grid,
  Text,
  Button,
  InputField,
  Label,
  Separator,
  SmallIconButton,
  IconButton,
  Tooltip,
  ScrollArea,
  PanelBanner,
  Link,
  Select,
  TextArea,
  Checkbox,
  theme,
  rawTheme,
  buttonStyle,
  Popover,
  PopoverTitle,
  PopoverTitleActions,
  StorySection,
} from "@webstudio-is/design-system";
import {
  CheckCircleIcon,
  AlertIcon,
  CopyIcon,
  GearIcon,
  UpgradeIcon,
  InfoCircleIcon,
  HelpIcon,
} from "@webstudio-is/icons";
import { CollapsibleDomainSection } from "./collapsible-domain-section";

export default {
  title: "Builder/Publish",
};

const StatusIcon = ({ status }: { status: "ok" | "error" | "pending" }) => (
  <Flex
    align="center"
    justify="center"
    css={{
      width: theme.sizes.controlHeight,
      height: theme.sizes.controlHeight,
      color:
        status === "error"
          ? theme.colors.foregroundDestructive
          : status === "pending"
            ? theme.colors.foregroundSubtle
            : theme.colors.foregroundSuccessText,
    }}
  >
    {status === "error" ? <AlertIcon /> : <CheckCircleIcon />}
  </Flex>
);

const DomainSuffix = ({ status }: { status: "ok" | "error" | "pending" }) => (
  <Grid flow="column" align="center">
    <Tooltip content={<Text>Status</Text>}>
      <StatusIcon status={status} />
    </Tooltip>
    <IconButton type="button" tabIndex={-1}>
      <CopyIcon />
    </IconButton>
  </Grid>
);

const MockCheckbox = ({ checked = false }: { checked?: boolean }) => (
  <Checkbox defaultChecked={checked} />
);

// Story: Staging domain section (the wstd.work domain)
export const StagingDomain = () => (
  <StorySection title="Staging Domain">
    <Flex direction="column" gap="3" css={{ width: theme.spacing[33] }}>
      <Text variant="labels">Published</Text>
      <CollapsibleDomainSection
        title="my-project.wstd.work"
        prefix={<MockCheckbox checked />}
        suffix={<DomainSuffix status="ok" />}
        initiallyOpen
      >
        <Grid gap={2}>
          <Grid flow="column" align="center" gap={2}>
            <Flex align="center" gap={1} css={{ width: theme.spacing[20] }}>
              <Label>Domain:</Label>
              <Tooltip
                content="Domain can't be renamed once published"
                variant="wrapped"
              >
                <InfoCircleIcon
                  tabIndex={0}
                  style={{ flexShrink: 0 }}
                  color={rawTheme.colors.foregroundSubtle}
                />
              </Tooltip>
            </Flex>
            <InputField text="mono" value="my-project" disabled />
          </Grid>
          <Grid flow="column" align="center" gap={2}>
            <Label css={{ width: theme.spacing[20] }}>Username:</Label>
            <InputField text="mono" value="staging" readOnly />
          </Grid>
          <Grid flow="column" align="center" gap={2}>
            <Flex align="center" gap={1} css={{ width: theme.spacing[20] }}>
              <Label>Password:</Label>
              <Tooltip
                content="Read-only password for staging"
                variant="wrapped"
              >
                <InfoCircleIcon
                  tabIndex={0}
                  style={{ flexShrink: 0 }}
                  color={rawTheme.colors.foregroundSubtle}
                />
              </Tooltip>
            </Flex>
            <InputField text="mono" value="abc123" readOnly />
          </Grid>
          <Tooltip content="Unpublish to enable domain renaming">
            <Button color="destructive" css={{ width: "100%" }}>
              Unpublish
            </Button>
          </Tooltip>
        </Grid>
      </CollapsibleDomainSection>

      <Text variant="labels">Not yet published</Text>
      <CollapsibleDomainSection
        title="my-project.wstd.work"
        prefix={<MockCheckbox />}
        suffix={<DomainSuffix status="pending" />}
        initiallyOpen
      >
        <Grid gap={2}>
          <Grid flow="column" align="center" gap={2}>
            <Flex align="center" gap={1} css={{ width: theme.spacing[20] }}>
              <Label>Domain:</Label>
            </Flex>
            <InputField text="mono" value="my-project" />
          </Grid>
        </Grid>
      </CollapsibleDomainSection>

      <Text variant="labels">Domain rename error</Text>
      <CollapsibleDomainSection
        title="my-project.wstd.work"
        prefix={<MockCheckbox />}
        suffix={<DomainSuffix status="error" />}
        initiallyOpen
      >
        <Grid gap={2}>
          <Grid flow="column" align="center" gap={2}>
            <Flex align="center" gap={1} css={{ width: theme.spacing[20] }}>
              <Label>Domain:</Label>
            </Flex>
            <InputField text="mono" value="bad domain!" color="error" />
            <Text color="destructive">
              Domain must only contain letters, numbers, and hyphens
            </Text>
          </Grid>
        </Grid>
      </CollapsibleDomainSection>
    </Flex>
  </StorySection>
);

// Story: Custom domain states
export const CustomDomains = () => (
  <StorySection title="Custom Domains">
    <Flex direction="column" gap="3" css={{ width: theme.spacing[33] }}>
      <Text variant="labels">Verified and active</Text>
      <CollapsibleDomainSection
        title="example.com"
        prefix={<MockCheckbox checked />}
        suffix={<DomainSuffix status="ok" />}
        initiallyOpen
      >
        <Grid gap={2}>
          <Flex align="center" gap={1}>
            <CheckCircleIcon color={rawTheme.colors.foregroundSuccessText} />
            <Text>Published 2 hours ago</Text>
          </Flex>
          <Grid gap={1}>
            <Text variant="labels">DNS records</Text>
            <Grid
              css={{
                gridTemplateColumns: "auto 1fr 1fr",
                gap: theme.spacing[2],
              }}
            >
              <Text variant="mono" color="subtle">
                CNAME
              </Text>
              <Text variant="mono">www</Text>
              <Text variant="mono">cname.wstd.work</Text>
              <Text variant="mono" color="subtle">
                TXT
              </Text>
              <Text variant="mono">@</Text>
              <Text variant="mono">webstudio-verify=abc123</Text>
            </Grid>
          </Grid>
          <Grid flow="column" gap={2}>
            <Button color="neutral">Verify DNS</Button>
            <Button color="destructive">Remove</Button>
          </Grid>
        </Grid>
      </CollapsibleDomainSection>

      <Text variant="labels">Unverified (DNS not configured)</Text>
      <CollapsibleDomainSection
        title="new-domain.com"
        prefix={<MockCheckbox />}
        suffix={<DomainSuffix status="error" />}
        initiallyOpen
      >
        <Grid gap={2}>
          <Flex align="center" gap={1}>
            <AlertIcon color={rawTheme.colors.foregroundDestructive} />
            <Text color="destructive">
              DNS records not found. Add these records at your registrar:
            </Text>
          </Flex>
          <Grid
            css={{ gridTemplateColumns: "auto 1fr 1fr", gap: theme.spacing[2] }}
          >
            <Text variant="mono" color="subtle">
              CNAME
            </Text>
            <Text variant="mono">www</Text>
            <Text variant="mono">cname.wstd.work</Text>
            <Text variant="mono" color="subtle">
              TXT
            </Text>
            <Text variant="mono">@</Text>
            <Text variant="mono">webstudio-verify=xyz789</Text>
          </Grid>
          <Grid flow="column" gap={2}>
            <Button color="neutral">Check status</Button>
            <Button color="destructive">Remove</Button>
          </Grid>
        </Grid>
      </CollapsibleDomainSection>

      <Text variant="labels">Pending (initializing)</Text>
      <CollapsibleDomainSection
        title="staging.example.com"
        prefix={<MockCheckbox />}
        suffix={<DomainSuffix status="pending" />}
        initiallyOpen
      >
        <Grid gap={2}>
          <Flex align="center" gap={1}>
            <InfoCircleIcon color={rawTheme.colors.foregroundSubtle} />
            <Text color="subtle">Setting up SSL certificate...</Text>
          </Flex>
          <Button color="neutral">Check status</Button>
        </Grid>
      </CollapsibleDomainSection>

      <Text variant="labels">Error state</Text>
      <CollapsibleDomainSection
        title="broken.example.com"
        prefix={<MockCheckbox />}
        suffix={<DomainSuffix status="error" />}
        initiallyOpen
      >
        <Grid gap={2}>
          <Flex align="center" gap={1}>
            <AlertIcon color={rawTheme.colors.foregroundDestructive} />
            <Text color="destructive">
              SSL provisioning failed. Please verify your DNS records and try
              again.
            </Text>
          </Flex>
          <Grid flow="column" gap={2}>
            <Button color="neutral">Verify DNS</Button>
            <Button color="destructive">Remove</Button>
          </Grid>
        </Grid>
      </CollapsibleDomainSection>
    </Flex>
  </StorySection>
);

// Story: Publish button states
export const PublishButton = () => (
  <StorySection title="Publish Button">
    <Flex direction="column" gap="3" css={{ width: theme.spacing[33] }}>
      <Text variant="labels">Ready to publish</Text>
      <Button color="positive" css={{ width: "100%" }}>
        Publish
      </Button>

      <Text variant="labels">Publishing with countdown</Text>
      <Button color="positive" css={{ width: "100%" }}>
        Publishing (45s)
      </Button>

      <Text variant="labels">Publishing (pending)</Text>
      <Button color="positive" state="pending" css={{ width: "100%" }}>
        Publish
      </Button>

      <Text variant="labels">No domains selected</Text>
      <Tooltip content="Select at least one domain to publish">
        <Button color="positive" disabled css={{ width: "100%" }}>
          Publish
        </Button>
      </Tooltip>

      <Text variant="labels">Disabled (restricted features)</Text>
      <Button color="positive" disabled css={{ width: "100%" }}>
        Publish
      </Button>

      <Text variant="labels">Publish error</Text>
      <Flex gap={2} shrink={false} direction="column">
        <Text color="destructive">
          Build timed out after 3 minutes. Please try again.
        </Text>
        <Button color="positive" css={{ width: "100%" }}>
          Publish
        </Button>
      </Flex>
    </Flex>
  </StorySection>
);

// Story: Upgrade banners
export const UpgradeBanners = () => (
  <StorySection title="Upgrade Banners">
    <Flex direction="column" gap="5" css={{ width: theme.spacing[33] }}>
      <Text variant="labels">Publish limit exceeded</Text>
      <PanelBanner>
        <Text variant="regularBold">
          Upgrade to publish more than 1 time per day:
        </Text>
        <Link
          className={buttonStyle({ color: "gradient" })}
          color="contrast"
          underline="none"
          href="#"
        >
          Upgrade
        </Link>
      </PanelBanner>

      <Text variant="labels">Restricted pro features</Text>
      <PanelBanner>
        <Text variant="regularBold">Following Pro features are used:</Text>
        <Text as="ul" color="destructive" css={{ paddingLeft: "1em" }}>
          <li>
            <Flex align="center" gap="1">
              <button
                style={{
                  all: "unset",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
                type="button"
              >
                Dynamic path
              </button>
            </Flex>
          </li>
          <li>
            <Flex align="center" gap="1">
              Resource variable
              <Tooltip
                variant="wrapped"
                content="Used in Blog Post page for fetching CMS data"
              >
                <SmallIconButton icon={<HelpIcon />} />
              </Tooltip>
            </Flex>
          </li>
          <li>Redirect</li>
          <li>Custom contact email</li>
        </Text>
        <Text>
          You can delete these features or upgrade to publish to custom domains.
        </Text>
        <Flex align="center" gap={1}>
          <UpgradeIcon />
          <Link color="inherit" href="#">
            Upgrade to Pro
          </Link>
        </Flex>
      </PanelBanner>

      <Text variant="labels">Domain limit reached</Text>
      <PanelBanner>
        <Text variant="regular">
          <Text variant="regularBold" inline>
            Upgrade to a Pro account
          </Text>{" "}
          to add unlimited domains and publish to each domain individually.
        </Text>
        <Flex align="center" gap={1}>
          <UpgradeIcon />
          <Link color="inherit" href="#">
            Upgrade to Pro
          </Link>
        </Flex>
      </PanelBanner>

      <Text variant="labels">Unpublished domain reminder</Text>
      <PanelBanner>
        <Flex align="center" gap="1">
          <InfoCircleIcon color={rawTheme.colors.foregroundMain} />
          <Text variant="regularBold">Don&apos;t forget to publish</Text>
        </Flex>
        <Text>
          You have a custom domain that hasn&apos;t been published yet. Hit
          publish to make it live.
        </Text>
      </PanelBanner>
    </Flex>
  </StorySection>
);

// Story: Full publish dialog layout
export const PublishDialogLayout = () => (
  <StorySection title="Publish Dialog Layout">
    <Flex
      direction="column"
      css={{
        width: theme.spacing[33],
        border: `1px solid ${rawTheme.colors.borderMain}`,
        borderRadius: theme.borderRadius[4],
      }}
    >
      <PopoverTitle
        suffix={
          <PopoverTitleActions>
            <IconButton type="button">
              <GearIcon />
            </IconButton>
          </PopoverTitleActions>
        }
      >
        Publish
      </PopoverTitle>
      <ScrollArea css={{ maxHeight: 400 }}>
        <CollapsibleDomainSection
          title="my-project.wstd.work"
          prefix={<MockCheckbox checked />}
          suffix={<DomainSuffix status="ok" />}
          initiallyOpen
        >
          <Grid gap={2}>
            <Grid flow="column" align="center" gap={2}>
              <Flex align="center" gap={1} css={{ width: theme.spacing[20] }}>
                <Label>Domain:</Label>
              </Flex>
              <InputField text="mono" value="my-project" disabled />
            </Grid>
            <Tooltip content="Unpublish to enable domain renaming">
              <Button color="destructive" css={{ width: "100%" }}>
                Unpublish
              </Button>
            </Tooltip>
          </Grid>
        </CollapsibleDomainSection>

        <CollapsibleDomainSection
          title="example.com"
          prefix={<MockCheckbox checked />}
          suffix={<DomainSuffix status="ok" />}
        >
          <Text>Verified and active</Text>
        </CollapsibleDomainSection>

        <CollapsibleDomainSection
          title="blog.example.com"
          prefix={<MockCheckbox />}
          suffix={<DomainSuffix status="error" />}
        >
          <Text color="destructive">DNS not configured</Text>
        </CollapsibleDomainSection>
      </ScrollArea>

      <Flex direction="column" justify="end" css={{ height: 0 }}>
        <Separator />
      </Flex>

      <Flex direction="column" gap="2" css={{ padding: theme.panel.padding }}>
        <Button color="positive">Publish</Button>
      </Flex>
    </Flex>
  </StorySection>
);

// Story: Export dialog layout
export const ExportDialogLayout = () => (
  <StorySection title="Export Dialog Layout">
    <Popover>
      <Flex
        direction="column"
        css={{
          width: theme.spacing[33],
          border: `1px solid ${rawTheme.colors.borderMain}`,
          borderRadius: theme.borderRadius[4],
        }}
      >
        <PopoverTitle>Export</PopoverTitle>
        <Grid columns={1} gap={3} css={{ padding: theme.panel.padding }}>
          <Grid columns={2} gap={2} align="center">
            <Text color="main" variant="labels">
              Destination
            </Text>
            <Select
              fullWidth
              value="docker"
              options={["docker", "static", "vercel", "netlify"]}
              getLabel={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
              onChange={() => {}}
            />
          </Grid>

          <Grid columns={1} gap={2}>
            <Grid
              gap={2}
              align="center"
              css={{ gridTemplateColumns: "1fr auto 1fr" }}
            >
              <Separator css={{ alignSelf: "unset" }} />
              <Text color="main">CLI</Text>
              <Separator css={{ alignSelf: "unset" }} />
            </Grid>

            <Grid columns={1} gap={1}>
              <Text color="main" variant="labels">
                Step 1
              </Text>
              <Text color="subtle">
                Download and install Node v20+ from nodejs.org
              </Text>
            </Grid>

            <Grid columns={1} gap={1}>
              <Text color="main" variant="labels">
                Step 2
              </Text>
              <Text color="subtle">
                Run this command to install Webstudio CLI and sync your project.
              </Text>
            </Grid>
            <Flex gap={2}>
              <InputField
                css={{ flex: 1 }}
                text="mono"
                readOnly
                value="npx webstudio@latest"
              />
              <Button type="button" color="neutral" prefix={<CopyIcon />}>
                Copy
              </Button>
            </Flex>

            <Grid columns={1} gap={1}>
              <Text color="main" variant="labels">
                Step 3
              </Text>
              <Text color="subtle">Run this command to publish to Docker</Text>
            </Grid>
            <Flex gap={2} align="end">
              <TextArea
                css={{ flex: 1 }}
                variant="mono"
                readOnly
                value={"docker build -t my-image .\ndocker run my-image"}
              />
              <Button
                type="button"
                css={{ flexShrink: 0 }}
                color="neutral"
                prefix={<CopyIcon />}
              >
                Copy
              </Button>
            </Flex>
          </Grid>
        </Grid>
      </Flex>
    </Popover>
  </StorySection>
);

// Story: Static export variant
export const ExportStaticLayout = () => (
  <StorySection title="Export Static Layout">
    <Popover>
      <Flex
        direction="column"
        css={{
          width: theme.spacing[33],
          border: `1px solid ${rawTheme.colors.borderMain}`,
          borderRadius: theme.borderRadius[4],
        }}
      >
        <PopoverTitle>Export</PopoverTitle>
        <Grid columns={1} gap={3} css={{ padding: theme.panel.padding }}>
          <Grid columns={2} gap={2} align="center">
            <Text color="main" variant="labels">
              Destination
            </Text>
            <Select
              fullWidth
              value="static"
              options={["docker", "static", "vercel", "netlify"]}
              getLabel={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
              onChange={() => {}}
            />
          </Grid>

          <Button color="positive">Build and download static site</Button>
          <Text color="subtle">
            Learn about deploying static sites{" "}
            <Link variant="inherit" color="inherit" href="#">
              here
            </Link>
          </Text>
        </Grid>
      </Flex>
    </Popover>
  </StorySection>
);
