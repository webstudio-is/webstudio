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
  DeprecatedTextField,
  theme,
  Tooltip,
  useId,
  Collapsible,
  keyframes,
} from "@webstudio-is/design-system";
import { CopyIcon, InfoIcon, MenuIcon, PlusIcon } from "@webstudio-is/icons";
import { Fragment, useState, type ComponentProps } from "react";

const Item = (props: ComponentProps<typeof Flex>) => (
  <Flex
    direction="column"
    css={{ padding: theme.spacing[7] }}
    gap="1"
    {...props}
  />
);

type PermissionProps = {
  title: string;
  info: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};
const Permission = ({
  title,
  info,
  checked,
  onCheckedChange,
}: PermissionProps) => {
  const id = useId();

  return (
    <Flex align="center" gap="1">
      <Switch checked={checked} id={id} onCheckedChange={onCheckedChange} />
      <Label htmlFor={id}>{title}</Label>
      <Tooltip content={info} variant="wrapped">
        <InfoIcon color={rawTheme.colors.foregroundSubtle} tabIndex={0} />
      </Tooltip>
    </Flex>
  );
};

type MenuProps = {
  relation: Relation;
  name: string;
  onChangePermission: (relation: Relation) => void;
  onChangeName: (name: string) => void;
  onDelete: () => void;
};

const Menu = ({
  relation,
  name,
  onChangePermission,
  onChangeName,
  onDelete,
}: MenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const handleCheckedChange = (relation: Relation) => (checked: boolean) => {
    if (checked) {
      onChangePermission(relation);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          prefix={<MenuIcon />}
          color="ghost"
          aria-label="Menu Button for options"
        ></Button>
      </PopoverTrigger>
      <PopoverContent css={{ zIndex: theme.zIndices[1] }}>
        <Item>
          <Label>Name</Label>
          <DeprecatedTextField
            autoFocus
            value={name}
            onChange={(event) => {
              onChangeName(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setIsOpen(false);
              }
            }}
          />
        </Item>
        <Separator />
        <Item>
          <Label>Permissions</Label>
          <Permission
            checked={relation === "viewers"}
            onCheckedChange={handleCheckedChange("viewers")}
            title="View"
            info="Recipients can only view the site"
          />
          {/*
           Hide temporarily until we have a way to allow edit content but not edit tree, etc.

          <Permission
            onCheckedChange={handleCheckedChange("editors")}
            checked={relation === "editors"}
            title="Edit Content"
            info="Recipients can view the site and edit content like text and images, but they will not be able to change the styles or structure of your site."
          />
          */}
          <Permission
            onCheckedChange={handleCheckedChange("builders")}
            checked={relation === "builders"}
            title="Build"
            info="Recipients can view the site and edit content like text and images and change the styles or structure of your site."
          />
        </Item>
        <Separator />
        <Item>
          {/* @todo need a menu item that looks like one from dropdown but without DropdownMenu */}
          <Button
            color="destructive"
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
  py: theme.spacing[5],
  px: theme.spacing[9],
  backgroundColor: theme.colors.backgroundPanel,
});

type Relation = "viewers" | "editors" | "builders";

export type LinkOptions = {
  token: string;
  name: string;
  relation: Relation;
};

type SharedLinkItemType = LinkOptions & {
  onChangeRelation: (permission: Relation) => void;
  onChangeName: (name: string) => void;
  onDelete: () => void;
  builderUrl: (props: {
    authToken: string;
    mode: "preview" | "edit";
  }) => string;
};

const SharedLinkItem = ({
  token,
  name,
  relation,
  onChangeRelation,
  onChangeName,
  onDelete,
  builderUrl,
}: SharedLinkItemType) => {
  const [currentName, setCurrentName] = useState(name);

  return (
    <Box className={itemStyle()}>
      <Label css={{ flexGrow: 1 }}>{currentName}</Label>
      <Button
        prefix={<CopyIcon />}
        onClick={() => {
          navigator.clipboard.writeText(
            builderUrl({
              authToken: token,
              mode: relation === "viewers" ? "preview" : "edit",
            })
          );
        }}
      >
        Copy link
      </Button>
      <Menu
        name={currentName}
        relation={relation}
        onChangePermission={onChangeRelation}
        onChangeName={(name) => {
          setCurrentName(name);
          onChangeName(name);
        }}
        onDelete={onDelete}
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
}: ShareProjectProps) => {
  const items = links.map((link) => (
    <Fragment key={link.token}>
      <SharedLinkItem
        {...link}
        onChangeRelation={(relation) => {
          onChange({ ...link, relation });
        }}
        onChangeName={(name) => {
          onChange({ ...link, name });
        }}
        onDelete={() => {
          onDelete(link);
        }}
        builderUrl={builderUrl}
      />
      <Separator />
    </Fragment>
  ));

  const create = (
    <Box className={itemStyle({ css: { py: theme.spacing["9"] } })}>
      <Button
        color="neutral"
        prefix={<PlusIcon />}
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
      css={{
        width: theme.spacing[33],
      }}
    >
      <Collapsible.Root open={items.length > 0}>
        <Collapsible.Content className={collapsibleStyle()}>
          {items}
        </Collapsible.Content>
      </Collapsible.Root>

      {create}
    </Flex>
  );
};
