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
  useId,
  Collapsible,
  keyframes,
  Text,
  InputField,
  Link,
  buttonStyle,
  IconButton,
  Checkbox,
  Grid,
} from "@webstudio-is/design-system";
import {
  CopyIcon,
  EllipsesIcon,
  PlusIcon,
  HelpIcon,
} from "@webstudio-is/icons";
import { Fragment, useState, type ComponentProps, type ReactNode } from "react";
import { useIds } from "../form-utils";
import { CopyToClipboard } from "~/builder/shared/copy-to-clipboard";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import type { BuilderMode } from "../nano-states";

const Item = (props: ComponentProps<typeof Flex>) => (
  <Flex
    direction="column"
    css={{ padding: theme.panel.padding }}
    gap="1"
    {...props}
  />
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
        <HelpIcon color={rawTheme.colors.foregroundSubtle} tabIndex={0} />
      </Tooltip>
    </Flex>
  );
};

type MenuProps = {
  name: string;
  value: LinkOptions;
  hasProPlan: boolean;
  onChange: (value: LinkOptions) => void;
  onDelete: () => void;
};

const Menu = ({ name, hasProPlan, value, onChange, onDelete }: MenuProps) => {
  const ids = useIds(["name", "canClone", "canCopy", "canPublish"]);
  const [isOpen, setIsOpen] = useState(false);
  const [customLinkName, setCustomLinkName] = useState<string>(name);

  const handleCheckedChange = (relation: Relation) => (checked: boolean) => {
    if (checked) {
      onChange({ ...value, relation });
    }
  };

  const saveCustomLinkName = () => {
    if (customLinkName.length === 0) {
      return;
    }

    onChange({ ...value, name: customLinkName.trim() });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          prefix={<EllipsesIcon />}
          color="ghost"
          aria-label="Menu Button for options"
        ></Button>
      </PopoverTrigger>
      <PopoverContent
        css={{
          //padding: 0,
          width: theme.spacing[24],
        }}
        sideOffset={0}
        onInteractOutside={saveCustomLinkName}
      >
        <Item>
          <Label htmlFor={ids.name}>Name</Label>
          <InputField
            id={ids.name}
            color={customLinkName.length === 0 ? "error" : undefined}
            value={customLinkName}
            onChange={(event) => setCustomLinkName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                saveCustomLinkName();
                setIsOpen(false);
              }
            }}
            onBlur={saveCustomLinkName}
            placeholder="Share Project"
            name="Name"
            autoFocus
          />
        </Item>
        <Separator />
        <Item>
          <Label>Permissions</Label>
          <Permission
            checked={value.relation === "viewers"}
            onCheckedChange={handleCheckedChange("viewers")}
            title="View"
            //info="Recipients can view, copy instances and clone the project"
            info={
              <Flex direction="column">
                Recipients can view, copy instances and clone the project.
                {hasProPlan !== true && (
                  <>
                    <br />
                    <br />
                    Upgrade to a Pro account to set additional permissions.
                    <br /> <br />
                    <Link
                      className={buttonStyle({ color: "gradient" })}
                      color="contrast"
                      underline="none"
                      href="https://webstudio.is/pricing"
                      target="_blank"
                    >
                      Upgrade
                    </Link>
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
                disabled={hasProPlan !== true || value.relation !== "viewers"}
                checked={value.canClone}
                onCheckedChange={(canClone) => {
                  onChange({ ...value, canClone: Boolean(canClone) });
                }}
                id={ids.canClone}
              />
              <Label
                htmlFor={ids.canClone}
                disabled={hasProPlan !== true || value.relation !== "viewers"}
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
                disabled={hasProPlan !== true || value.relation !== "viewers"}
                checked={value.canCopy}
                onCheckedChange={(canCopy) => {
                  onChange({ ...value, canCopy: Boolean(canCopy) });
                }}
                id={ids.canCopy}
              />
              <Label
                htmlFor={ids.canCopy}
                disabled={hasProPlan !== true || value.relation !== "viewers"}
              >
                Can copy
              </Label>
            </Grid>
          </Grid>

          {isFeatureEnabled("contentEditableMode") && (
            <>
              <Permission
                disabled={hasProPlan !== true}
                onCheckedChange={handleCheckedChange("editors")}
                checked={value.relation === "editors"}
                title="Content"
                info={
                  <Flex direction="column">
                    Recipients can edit content only, such as text, images, and
                    predefined components.
                    {hasProPlan !== true && (
                      <>
                        <br />
                        <br />
                        Upgrade to a Pro account to share with Content Edit
                        permissions.
                        <br /> <br />
                        <Link
                          className={buttonStyle({ color: "gradient" })}
                          color="contrast"
                          underline="none"
                          href="https://webstudio.is/pricing"
                          target="_blank"
                        >
                          Upgrade
                        </Link>
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
                      hasProPlan !== true || value.relation !== "editors"
                    }
                    checked={value.canPublish}
                    onCheckedChange={(canPublish) => {
                      onChange({ ...value, canPublish: Boolean(canPublish) });
                    }}
                    id={ids.canPublish}
                  />
                  <Label
                    htmlFor={ids.canPublish}
                    disabled={
                      hasProPlan !== true || value.relation !== "editors"
                    }
                  >
                    Can publish
                  </Label>
                </Grid>
              </Grid>
            </>
          )}

          <Permission
            onCheckedChange={handleCheckedChange("builders")}
            checked={value.relation === "builders"}
            title="Build"
            info="Recipients can make any changes but can not publish the project."
          />

          <Permission
            disabled={hasProPlan !== true}
            onCheckedChange={handleCheckedChange("administrators")}
            checked={value.relation === "administrators"}
            title="Admin"
            info={
              <Flex direction="column">
                Recipients can make any changes and can also publish the
                project.
                {hasProPlan !== true && (
                  <>
                    <br />
                    <br />
                    Upgrade to a Pro account to share with Admin permissions.
                    <br /> <br />
                    <Link
                      className={buttonStyle({ color: "gradient" })}
                      color="contrast"
                      underline="none"
                      href="https://webstudio.is/pricing"
                      target="_blank"
                    >
                      Upgrade
                    </Link>
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

type Relation = "viewers" | "editors" | "builders" | "administrators";

export type LinkOptions = {
  token: string;
  name: string;
  relation: Relation;
  canCopy: boolean;
  canClone: boolean;
  canPublish: boolean;
};

type SharedLinkItemType = {
  value: LinkOptions;
  onChange: (value: LinkOptions) => void;
  onDelete: () => void;
  builderUrl: (props: { authToken: string; mode: BuilderMode }) => string;
  hasProPlan: boolean;
};

const relationToMode: Record<Relation, BuilderMode> = {
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
  hasProPlan,
}: SharedLinkItemType) => {
  const [currentName, setCurrentName] = useState(value.name);

  return (
    <Box className={itemStyle()}>
      <Label css={{ flexGrow: 1 }}>{currentName}</Label>
      <CopyToClipboard
        text={builderUrl({
          authToken: value.token,
          mode: relationToMode[value.relation],
        })}
        copyText="Copy link"
      >
        <IconButton aria-label="Copy link">
          <CopyIcon aria-hidden />
        </IconButton>
      </CopyToClipboard>
      <Menu
        name={currentName}
        value={value}
        onChange={(value) => {
          setCurrentName(value.name);
          onChange(value);
        }}
        onDelete={onDelete}
        hasProPlan={hasProPlan}
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
  hasProPlan: boolean;
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
  hasProPlan,
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
        hasProPlan={hasProPlan}
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
    <Flex direction="column" css={{ width: theme.spacing[33] }}>
      <Collapsible.Root open={items.length > 0}>
        <Collapsible.Content className={collapsibleStyle()}>
          {items}
        </Collapsible.Content>
      </Collapsible.Root>

      {create}
    </Flex>
  );
};
