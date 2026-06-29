import {
  useEffect,
  Fragment,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { shallowEqual } from "shallow-equal";
import { type Role, roleLabels } from "@webstudio-is/project";
import { roleDescriptions } from "~/shared/permissions";
import {
  Box,
  Button,
  css,
  Flex,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  rawTheme,
  Separator,
  Switch,
  theme,
  Tooltip,
  Collapsible,
  keyframes,
  Text,
  InputField,
  Link,
  IconButton,
  Checkbox,
  Grid,
  PanelBanner,
} from "@webstudio-is/design-system";
import {
  CopyIcon,
  EllipsesIcon,
  PlusIcon,
  InfoCircleIcon,
  UpgradeIcon,
} from "@webstudio-is/icons";
import { CopyToClipboard } from "~/shared/copy-to-clipboard";
import { useIds } from "../form-utils";
import type { BuilderMode } from "../nano-states";

const Item = (props: ComponentProps<typeof Flex>) => (
  <Flex
    direction="column"
    css={{ padding: theme.panel.padding }}
    gap="1"
    {...props}
  />
);

const UpgradeLink = () => (
  <Flex align="center" gap={1}>
    <UpgradeIcon />
    <Link color="inherit" target="_blank" href="https://webstudio.is/pricing">
      Upgrade
    </Link>
  </Flex>
);

export const ShareLinkSecurityNotice = () => (
  <PanelBanner variant="warning">
    <Text>
      Sharing links over insecure channels can expose project access. Upgrade to
      the Team plan for safer collaboration.
    </Text>
    <UpgradeLink />
  </PanelBanner>
);

const PermissionTooltip = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <Tooltip
    content={
      <Flex direction="column" gap="2" css={{ maxWidth: theme.spacing[28] }}>
        <Text variant="titles">{title}</Text>
        <Text>{children}</Text>
      </Flex>
    }
    variant="wrapped"
  >
    <InfoCircleIcon color={rawTheme.colors.foregroundSubtle} tabIndex={0} />
  </Tooltip>
);

const PermissionTooltipContent = ({
  children,
  upgrade = false,
}: {
  children: ReactNode;
  upgrade?: boolean;
}) => (
  <Flex direction="column">
    {children}
    {upgrade && (
      <Box css={{ mt: theme.spacing[2] }}>
        <UpgradeLink />
      </Box>
    )}
  </Flex>
);

const getApiPermissionDescription = ({
  canPublish,
  role,
}: {
  canPublish: boolean;
  role: Role;
}) => {
  const descriptions: Record<Role, string> = {
    viewers:
      "Allows read-only API access: inspect permissions, project/build snapshots, pages, folders, instances, text, styles, variables, resources, assets, publish history, domains, and asset usage.",
    editors: canPublish
      ? "Allows viewer API access, content-mode text and prop changes, plus publishing and unpublishing project and custom domains. It cannot change pages, design data, assets, variables, resources, or domains."
      : "Allows viewer API access and content-mode text and prop changes. Enable Can publish to allow publishing and unpublishing. It cannot change pages, design data, assets, variables, resources, or domains.",
    builders:
      "Allows read and build API access: pages, folders, instances, text, props, styles, design tokens, CSS variables, data variables, resources, assets, patches, and project-domain publish/unpublish.",
    administrators:
      "Allows full project API access: all read, content, build, asset, publish/unpublish, and domain management operations.",
  };
  return descriptions[role];
};

export const __testing__ = { getApiPermissionDescription };

type PermissionProps = {
  title: string;
  description: ReactNode;
  upgrade?: boolean;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
};
const Permission = ({
  title,
  description,
  upgrade = false,
  checked,
  disabled = false,
  onCheckedChange,
}: PermissionProps) => {
  const id = useId();

  return (
    <Flex align="center" gap="1" css={{ whiteSpace: "nowrap" }}>
      <Switch
        disabled={disabled}
        checked={checked}
        id={id}
        onCheckedChange={onCheckedChange}
      />
      <Label disabled={disabled} htmlFor={id}>
        {title}
      </Label>
      <PermissionTooltip title={title}>
        <PermissionTooltipContent upgrade={upgrade}>
          {description}
        </PermissionTooltipContent>
      </PermissionTooltip>
    </Flex>
  );
};

type CapabilityProps = {
  id: string;
  title: string;
  description: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
};

const Capability = ({
  id,
  title,
  description,
  checked,
  disabled = false,
  onCheckedChange,
}: CapabilityProps) => {
  return (
    <Grid
      gap={1}
      flow="column"
      css={{
        alignItems: "center",
        justifyContent: "start",
        whiteSpace: "nowrap",
      }}
    >
      <Checkbox
        disabled={disabled}
        checked={checked}
        onCheckedChange={(value) => {
          if (disabled) {
            return;
          }
          onCheckedChange(Boolean(value));
        }}
        id={id}
      />
      <Label htmlFor={id} disabled={disabled}>
        {title}
      </Label>
      <PermissionTooltip title={title}>{description}</PermissionTooltip>
    </Grid>
  );
};

type MenuProps = {
  name: string;
  value: LinkOptions;
  allowAdditionalPermissions: boolean;
  onChange: (value: LinkOptionsUpdate) => void;
  onDelete: () => void;
};

const Menu = ({
  name,
  allowAdditionalPermissions,
  value,
  onChange,
  onDelete,
}: MenuProps) => {
  const ids = useIds([
    "name",
    "canClone",
    "canCopy",
    "canPublish",
    "canUseApi",
  ]);
  const [isOpen, setIsOpen] = useState(false);
  const [draftLink, setDraftLink] = useState(value);
  const draftLinkRef = useRef(value);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const updateDraftLink = (update: LinkOptionsUpdate) => {
    const nextDraftLink = { ...draftLinkRef.current, ...update };
    draftLinkRef.current = nextDraftLink;
    setDraftLink(nextDraftLink);
  };

  const handleCheckedChange = (role: Role) => (checked: boolean) => {
    if (checked) {
      updateDraftLink({ relation: role });
    }
  };

  const renderAdvanced = (role: Role, children: ReactNode) =>
    draftLink.relation === role ? (
      <Grid gap={1} css={{ ml: theme.spacing[6] }}>
        {children}
      </Grid>
    ) : undefined;

  const renderApiCapability = (role: Role) => {
    const canUseApi = draftLink.canUseApi === true;
    const isApiForbidden = !allowAdditionalPermissions && canUseApi === false;
    const description = (
      <PermissionTooltipContent upgrade={!allowAdditionalPermissions}>
        {getApiPermissionDescription({
          canPublish: draftLink.canPublish,
          role,
        })}
      </PermissionTooltipContent>
    );

    return (
      <Capability
        id={ids.canUseApi}
        title="API"
        checked={canUseApi}
        disabled={isApiForbidden}
        onCheckedChange={(canUseApi) => updateDraftLink({ canUseApi })}
        description={description}
      />
    );
  };

  const saveDraftLink = (name = draftLinkRef.current.name) => {
    const nextName = name.trim();
    const nextLink = {
      ...draftLinkRef.current,
      name: nextName.length === 0 ? value.name : nextName,
    };
    draftLinkRef.current = nextLink;
    if (
      shallowEqual(
        getComparableLinkOptions(nextLink),
        getComparableLinkOptions(value)
      )
    ) {
      return;
    }

    onChange(nextLink);
  };

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        if (open === false) {
          saveDraftLink(nameInputRef.current?.value);
        } else {
          draftLinkRef.current = value;
          setDraftLink(value);
        }
        setIsOpen(open);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          prefix={<EllipsesIcon />}
          color="ghost"
          aria-label="Menu Button for options"
        ></Button>
      </PopoverTrigger>
      <PopoverContent
        aria-label={`Share link options ${name}`}
        css={{
          width: theme.spacing[28],
        }}
        sideOffset={0}
      >
        <Item>
          <Label htmlFor={ids.name}>Name</Label>
          <InputField
            id={ids.name}
            inputRef={nameInputRef}
            color={draftLink.name.length === 0 ? "error" : undefined}
            value={draftLink.name}
            onChange={(event) => updateDraftLink({ name: event.target.value })}
            onInput={(event) =>
              updateDraftLink({ name: event.currentTarget.value })
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                saveDraftLink(event.currentTarget.value);
                setIsOpen(false);
              }
            }}
            placeholder="Share Project"
            name="Name"
            autoFocus
          />
        </Item>
        <Separator />
        <Item>
          <Label>Permissions</Label>
          <Permission
            checked={draftLink.relation === "viewers"}
            onCheckedChange={handleCheckedChange("viewers")}
            title={roleLabels.viewers}
            description={roleDescriptions.viewers}
          />
          {renderAdvanced(
            "viewers",
            <>
              <Capability
                id={ids.canClone}
                title="Can clone"
                checked={draftLink.canClone}
                disabled={!allowAdditionalPermissions}
                onCheckedChange={(canClone) => updateDraftLink({ canClone })}
                description={
                  <PermissionTooltipContent
                    upgrade={!allowAdditionalPermissions}
                  >
                    Allows viewers to clone the project from this share link.
                  </PermissionTooltipContent>
                }
              />
              <Capability
                id={ids.canCopy}
                title="Can copy"
                checked={draftLink.canCopy}
                disabled={!allowAdditionalPermissions}
                onCheckedChange={(canCopy) => updateDraftLink({ canCopy })}
                description={
                  <PermissionTooltipContent
                    upgrade={!allowAdditionalPermissions}
                  >
                    Allows viewers to copy project content from this share link.
                  </PermissionTooltipContent>
                }
              />
              {renderApiCapability("viewers")}
            </>
          )}

          <Permission
            disabled={!allowAdditionalPermissions}
            onCheckedChange={handleCheckedChange("editors")}
            checked={draftLink.relation === "editors"}
            title={roleLabels.editors}
            description={roleDescriptions.editors}
            upgrade={!allowAdditionalPermissions}
          />
          {renderAdvanced(
            "editors",
            <>
              <Capability
                id={ids.canPublish}
                title="Can publish"
                checked={draftLink.canPublish}
                disabled={!allowAdditionalPermissions}
                onCheckedChange={(canPublish) =>
                  updateDraftLink({ canPublish })
                }
                description={
                  <PermissionTooltipContent
                    upgrade={!allowAdditionalPermissions}
                  >
                    Allows editors to publish from this share link.
                  </PermissionTooltipContent>
                }
              />
              {renderApiCapability("editors")}
            </>
          )}
          <Permission
            onCheckedChange={handleCheckedChange("builders")}
            checked={draftLink.relation === "builders"}
            title={roleLabels.builders}
            description={roleDescriptions.builders}
          />
          {renderAdvanced("builders", renderApiCapability("builders"))}

          <Permission
            disabled={!allowAdditionalPermissions}
            onCheckedChange={handleCheckedChange("administrators")}
            checked={draftLink.relation === "administrators"}
            title={roleLabels.administrators}
            description={roleDescriptions.administrators}
            upgrade={!allowAdditionalPermissions}
          />
          {renderAdvanced(
            "administrators",
            renderApiCapability("administrators")
          )}
        </Item>
        <Separator />
        <Item>
          <Button
            color="neutral-destructive"
            onClick={() => {
              onDelete();
            }}
          >
            Delete
          </Button>
        </Item>
      </PopoverContent>
    </Popover>
  );
};

const itemStyle = css({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing[3],
  padding: theme.panel.padding,
  backgroundColor: theme.colors.backgroundPanel,
});

export type LinkOptions = {
  token: string;
  name: string;
  relation: Role;
  canCopy: boolean;
  canClone: boolean;
  canPublish: boolean;
  canUseApi: boolean;
};

type LinkOptionsUpdate = Partial<Omit<LinkOptions, "token">>;

const getComparableLinkOptions = (link: LinkOptions): LinkOptionsUpdate => {
  const { token, ...options } = link;
  void token;
  return options;
};

type SharedLinkItemType = {
  value: LinkOptions;
  onChange: (value: LinkOptions) => void;
  onDelete: () => void;
  builderUrl: (props: { authToken: string; mode: BuilderMode }) => string;
  allowAdditionalPermissions: boolean;
};

const relationToMode: Record<Role, BuilderMode> = {
  viewers: "preview",
  editors: "content",
  builders: "design",
  administrators: "design",
};

const SharedLinkItem = ({
  value,
  onChange,
  onDelete,
  builderUrl,
  allowAdditionalPermissions,
}: SharedLinkItemType) => {
  const [currentLink, setCurrentLink] = useState(value);
  const currentLinkRef = useRef(value);

  useEffect(() => {
    currentLinkRef.current = value;
    setCurrentLink(value);
  }, [value]);

  const updateCurrentLink = (update: LinkOptionsUpdate) => {
    const nextLink = { ...currentLinkRef.current, ...update };
    currentLinkRef.current = nextLink;
    setCurrentLink(nextLink);
    onChange(nextLink);
  };

  return (
    <Box
      className={itemStyle()}
      role="group"
      aria-label={`Share link ${currentLink.name}`}
    >
      <Label css={{ flexGrow: 1 }}>{currentLink.name}</Label>
      <CopyToClipboard
        text={builderUrl({
          authToken: currentLink.token,
          mode: relationToMode[currentLink.relation],
        })}
        copyText="Copy link"
      >
        <IconButton aria-label="Copy link">
          <CopyIcon aria-hidden />
        </IconButton>
      </CopyToClipboard>
      <Menu
        name={currentLink.name}
        value={currentLink}
        onChange={updateCurrentLink}
        onDelete={onDelete}
        allowAdditionalPermissions={allowAdditionalPermissions}
      />
    </Box>
  );
};

type ShareProjectProps = {
  links?: Array<LinkOptions>;
  onChange: (link: LinkOptions) => void;
  onDelete: (link: LinkOptions) => void;
  onCreate: () => void;
  builderUrl: SharedLinkItemType["builderUrl"];
  isPending: boolean;
  allowAdditionalPermissions: boolean;
  isFreePlan: boolean;
};

const animateCollapsibleHeight = keyframes({
  "0%": {
    height: 0,
    overflow: "hidden",
    opacity: 0,
  },
  "100%": {
    height: "var(--radix-collapsible-content-height)",
    overflow: "hidden",
    opacity: 1,
  },
});

const collapsibleStyle = css({
  animation: `${animateCollapsibleHeight} 200ms ${theme.easing.easeOut}`,
});

export const ShareProject = ({
  links = [],
  onChange,
  onDelete,
  onCreate,
  builderUrl,
  isPending,
  allowAdditionalPermissions,
  isFreePlan,
}: ShareProjectProps) => {
  const items = links.map((link) => (
    <Fragment key={link.token}>
      <SharedLinkItem
        onChange={(value) => {
          onChange(value);
        }}
        onDelete={() => {
          onDelete(link);
        }}
        builderUrl={builderUrl}
        value={link}
        allowAdditionalPermissions={allowAdditionalPermissions}
      />
      <Separator />
    </Fragment>
  ));

  const create = (
    <Box className={itemStyle({ css: { py: theme.spacing["7"] } })}>
      <Button
        color="neutral"
        state={isPending ? "pending" : undefined}
        prefix={
          isPending ? <Flex css={{ width: theme.spacing[7] }} /> : <PlusIcon />
        }
        onClick={() => {
          onCreate();
        }}
      >
        {links.length === 0 ? "Share a custom link" : "Add another link"}
      </Button>
    </Box>
  );

  return (
    <Flex
      direction="column"
      role="region"
      aria-label="Share links"
      aria-busy={isPending}
      css={{ width: theme.spacing[33] }}
    >
      {isFreePlan && (
        <>
          <ShareLinkSecurityNotice />
          <Separator />
        </>
      )}

      <Collapsible.Root open={items.length > 0}>
        <Collapsible.Content className={collapsibleStyle()}>
          {items}
        </Collapsible.Content>
      </Collapsible.Root>

      {create}
    </Flex>
  );
};
