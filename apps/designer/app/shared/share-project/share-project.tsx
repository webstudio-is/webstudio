import {
  Box,
  Button,
  css,
  Flex,
  Label,
  DeprecatedPopover,
  DeprecatedPopoverContent,
  DeprecatedPopoverTrigger,
  rawTheme,
  Separator,
  Switch,
  TextField,
  theme,
  Tooltip,
  useId,
} from "@webstudio-is/design-system";
import { CopyIcon, InfoIcon, MenuIcon, PlusIcon } from "@webstudio-is/icons";
import { Fragment, useState, type ComponentProps } from "react";
import { motion } from "framer-motion";

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
  const handleCheckedChange = (relation: Relation) => (checked: boolean) => {
    if (checked) {
      onChangePermission(relation);
    }
  };

  return (
    <DeprecatedPopover>
      <DeprecatedPopoverTrigger asChild>
        <Button
          prefix={<MenuIcon />}
          color="ghost"
          aria-label="Menu Button for options"
        ></Button>
      </DeprecatedPopoverTrigger>
      <DeprecatedPopoverContent>
        <Item>
          <Label>Name</Label>
          <TextField
            autoFocus
            value={name}
            onChange={(event) => {
              onChangeName(event.target.value);
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
      </DeprecatedPopoverContent>
    </DeprecatedPopover>
  );
};

const itemStyle = css({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing[3],
  py: theme.spacing[5],
  px: theme.spacing[9],
  backgroundColor: theme.colors.background,
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
  designerUrl: (props: {
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
  designerUrl,
}: SharedLinkItemType) => {
  const [currentName, setCurrentName] = useState(name);

  return (
    <Box className={itemStyle()}>
      <Label css={{ flexGrow: 1 }}>{currentName}</Label>
      <Button
        prefix={<CopyIcon />}
        onClick={() => {
          navigator.clipboard.writeText(
            designerUrl({
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

export type ShareProjectProps = {
  links?: Array<LinkOptions>;
  onChange: (link: LinkOptions) => void;
  onDelete: (link: LinkOptions) => void;
  onCreate: () => void;
  designerUrl: SharedLinkItemType["designerUrl"];
};

const overflowHidden = css({
  overflow: "hidden",
});

export const ShareProject = ({
  links = [],
  onChange,
  onDelete,
  onCreate,
  designerUrl,
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
        designerUrl={designerUrl}
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
      {items.length > 0 && (
        <motion.div
          className={overflowHidden()}
          initial="collapsed"
          animate="open"
          variants={{
            collapsed: { opacity: 0.0, height: 0 },
            open: { opacity: 1, height: "auto" },
          }}
          transition={{ duration: 0.15 }}
        >
          {items}
        </motion.div>
      )}
      {create}
    </Flex>
  );
};
