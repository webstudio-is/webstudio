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
  buttonStyle,
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

const PricingUpgradeLink = ({
  children = "Upgrade",
}: {
  children?: string;
}) => (
  <Link
    className={buttonStyle({ color: "gradient" })}
    color="contrast"
    underline="none"
    href="https://webstudio.is/pricing"
    target="_blank"
  >
    {children}
  </Link>
);

export const ShareLinkSecurityNotice = () => (
  <PanelBanner variant="warning">
    <Text>
      Sharing links over insecure channels can expose project access. Upgrade to
      the Team plan for safer collaboration.
    </Text>
    <Flex align="center" gap={1}>
      <UpgradeIcon />
      <Link color="inherit" target="_blank" href="https://webstudio.is/pricing">
        Upgrade
      </Link>
    </Flex>
  </PanelBanner>
);

type PermissionProps = {
  title: string;
  info: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
};
const Permission = ({
  title,
  info,
  checked,
  disabled = false,
  onCheckedChange,
}: PermissionProps) => {
  const id = useId();

  const tooltipContent = (
    <Flex direction="column" gap="2" css={{ maxWidth: theme.spacing[28] }}>
      <Text variant="titles">{title}</Text>
      <Text>{info}</Text>
    </Flex>
  );

  return (
    <Flex align="center" gap="1">
      <Switch
        disabled={disabled}
        checked={checked}
        id={id}
        onCheckedChange={onCheckedChange}
      />
      <Label disabled={disabled} htmlFor={id}>
        {title}
      </Label>
      <Tooltip content={tooltipContent} variant="wrapped">
        <InfoCircleIcon color={rawTheme.colors.foregroundSubtle} tabIndex={0} />
      </Tooltip>
    </Flex>
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
  const ids = useIds(["name", "canClone", "canCopy", "canPublish"]);
  const [isOpen, setIsOpen] = useState(false);
  const [draftLink, setDraftLink] = useState(value);
  const draftLinkRef = useRef(value);

  const updateDraftLink = (update: LinkOptionsUpdate) => {
    const nextLink = { ...draftLinkRef.current, ...update };
    draftLinkRef.current = nextLink;
    setDraftLink(nextLink);
  };

  const handleCheckedChange = (role: Role) => (checked: boolean) => {
    if (checked) {
      updateDraftLink({ relation: role });
    }
  };

  const saveDraftLink = () => {
    const draft = draftLinkRef.current;
    const nextName = draft.name.trim();
    const nextLink = {
      ...draft,
      name: nextName.length === 0 ? value.name : nextName,
    };
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
          saveDraftLink();
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
          //padding: 0,
          width: theme.spacing[24],
        }}
        sideOffset={0}
      >
        <Item>
          <Label htmlFor={ids.name}>Name</Label>
          <InputField
            id={ids.name}
            color={draftLink.name.length === 0 ? "error" : undefined}
            value={draftLink.name}
            onChange={(event) => updateDraftLink({ name: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                saveDraftLink();
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
            info={
              <Flex direction="column">
                {roleDescriptions.viewers}
                {!allowAdditionalPermissions && (
                  <>
                    <br />
                    <br />
                    Upgrade to a Pro account to set additional permissions.
                    <br /> <br />
                    <PricingUpgradeLink />
                  </>
                )}
              </Flex>
            }
          />

          <Grid
            css={{
              ml: theme.spacing[6],
            }}
          >
            <Grid
              gap={1}
              flow={"column"}
              css={{
                alignItems: "center",
                justifyContent: "start",
              }}
            >
              <Checkbox
                disabled={
                  !allowAdditionalPermissions ||
                  draftLink.relation !== "viewers"
                }
                checked={draftLink.canClone}
                onCheckedChange={(canClone) => {
                  updateDraftLink({ canClone: Boolean(canClone) });
                }}
                id={ids.canClone}
              />
              <Label
                htmlFor={ids.canClone}
                disabled={
                  !allowAdditionalPermissions ||
                  draftLink.relation !== "viewers"
                }
              >
                Can clone
              </Label>
            </Grid>
            <Grid
              gap={1}
              flow={"column"}
              css={{
                alignItems: "center",
                justifyContent: "start",
              }}
            >
              <Checkbox
                disabled={
                  !allowAdditionalPermissions ||
                  draftLink.relation !== "viewers"
                }
                checked={draftLink.canCopy}
                onCheckedChange={(canCopy) => {
                  updateDraftLink({ canCopy: Boolean(canCopy) });
                }}
                id={ids.canCopy}
              />
              <Label
                htmlFor={ids.canCopy}
                disabled={
                  !allowAdditionalPermissions ||
                  draftLink.relation !== "viewers"
                }
              >
                Can copy
              </Label>
            </Grid>
          </Grid>

          <Permission
            disabled={!allowAdditionalPermissions}
            onCheckedChange={handleCheckedChange("editors")}
            checked={draftLink.relation === "editors"}
            title={roleLabels.editors}
            info={
              <Flex direction="column">
                {roleDescriptions.editors}
                {!allowAdditionalPermissions && (
                  <>
                    <br />
                    <br />
                    Upgrade to a Pro account to share with Content Edit
                    permissions.
                    <br /> <br />
                    <PricingUpgradeLink />
                  </>
                )}
              </Flex>
            }
          />
          <Grid
            css={{
              ml: theme.spacing[6],
            }}
          >
            <Grid
              gap={1}
              flow={"column"}
              css={{
                alignItems: "center",
                justifyContent: "start",
              }}
            >
              <Checkbox
                disabled={
                  !allowAdditionalPermissions ||
                  draftLink.relation !== "editors"
                }
                checked={draftLink.canPublish}
                onCheckedChange={(canPublish) => {
                  updateDraftLink({ canPublish: Boolean(canPublish) });
                }}
                id={ids.canPublish}
              />
              <Label
                htmlFor={ids.canPublish}
                disabled={
                  !allowAdditionalPermissions ||
                  draftLink.relation !== "editors"
                }
              >
                Can publish
              </Label>
            </Grid>
          </Grid>

          <Permission
            onCheckedChange={handleCheckedChange("builders")}
            checked={draftLink.relation === "builders"}
            title={roleLabels.builders}
            info={roleDescriptions.builders}
          />

          <Permission
            disabled={!allowAdditionalPermissions}
            onCheckedChange={handleCheckedChange("administrators")}
            checked={draftLink.relation === "administrators"}
            title={roleLabels.administrators}
            info={
              <Flex direction="column">
                {roleDescriptions.administrators}
                {!allowAdditionalPermissions && (
                  <>
                    <br />
                    <br />
                    Upgrade to a Pro account to share with Admin permissions.
                    <br /> <br />
                    <PricingUpgradeLink />
                  </>
                )}
              </Flex>
            }
          />
        </Item>
        <Separator />
        <Item>
          {/* @todo need a menu item that looks like one from dropdown but without DropdownMenu */}
          <Button
            color="neutral-destructive"
            onClick={() => {
              onDelete();
            }}
          >
            Delete Link
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
