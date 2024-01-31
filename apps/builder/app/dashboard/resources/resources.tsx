import {
  Flex,
  Grid,
  Link,
  Text,
  css,
  rawTheme,
  theme,
} from "@webstudio-is/design-system";
import {
  DiscordIcon,
  GithubIcon,
  Webstudio1cIcon,
  XIcon,
  Youtube1cIcon,
  type IconComponent,
  WebstudioIcon,
} from "@webstudio-is/icons";
import { Card, CardContent, CardFooter } from "../shared/card";
import { Panel } from "../shared/panel";
import { IntroVideoDialog } from "./intro-video";
import introThumb from "./intro-thumb.jpg";

const introThumbStyle = css({
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "center",
});

const IntroVideoCard = () => {
  return (
    <IntroVideoDialog asChild>
      <Card asChild>
        <button>
          <CardContent>
            <Flex align="center" justify="center">
              <img src={introThumb} className={introThumbStyle()} />
            </Flex>
          </CardContent>
          <CardFooter>
            <Flex justify="center" align="center" direction="column" grow>
              <Text variant="titles" align="center" color="main">
                Watch the Intro!
              </Text>
            </Flex>
          </CardFooter>
        </button>
      </Card>
    </IntroVideoDialog>
  );
};

const resourceIconSyle = css({
  display: "var(--ws-resource-icon-default-display, block)",
  color: `var(--ws-resource-icon-selected-color, ${theme.colors.foregroundSubtle})`,
  width: "35%",
  height: "auto",
  variants: {
    variant: {
      selected: {
        display: "var(--ws-resource-icon-selected-display, none)",
      },
    },
  },
});

const Resource = ({
  href,
  Icon,
  SelectedIcon,
  title,
  selectedColor = theme.colors.foregroundMain,
}: {
  href: string;
  Icon: IconComponent;
  SelectedIcon?: IconComponent;
  title: string;
  selectedColor?: string;
}) => {
  SelectedIcon || (SelectedIcon = Icon);
  return (
    <Card asChild>
      <Link
        href={href}
        target="_blank"
        underline="none"
        color="subtle"
        css={{
          "&:hover, &:focus-visible": {
            "--ws-resource-icon-selected-color": selectedColor,
            "--ws-resource-icon-selected-display": "block",
            "--ws-resource-icon-default-display": "none",
          },
        }}
      >
        <CardContent>
          <Flex align="center" justify="center">
            <Icon className={resourceIconSyle()} />
            <SelectedIcon
              className={resourceIconSyle({ variant: "selected" })}
            />
          </Flex>
        </CardContent>
        <CardFooter>
          <Flex justify="center" align="center" direction="column" grow>
            <Text variant="titles" align="center" color="main">
              {title}
            </Text>
          </Flex>
        </CardFooter>
      </Link>
    </Card>
  );
};

export const Resources = () => {
  return (
    <Panel>
      <Flex direction="column" gap="3">
        <Flex justify="between">
          <Text variant="brandSectionTitle" as="h2">
            Resources
          </Text>
        </Flex>
        <Grid
          gap="6"
          css={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${rawTheme.spacing[23]}, 1fr))`,
          }}
        >
          <IntroVideoCard />
          <Resource
            href="https://www.youtube.com/playlist?list=PL4vVqpngzeT4sDlanyPe99dYl8BgUYCac"
            title="Learn with Videos"
            Icon={Youtube1cIcon}
            selectedColor="#FF0000"
          />
          <Resource
            href="https://docs.webstudio.is/"
            title="Read the Docs"
            Icon={Webstudio1cIcon}
            SelectedIcon={WebstudioIcon}
          />
          <Resource
            href="https://discord.gg/UNdyrDkq5r"
            title="Join the Community"
            selectedColor="#5865F2"
            Icon={DiscordIcon}
          />
          <Resource
            href="https://x.com/getwebstudio"
            title="Follow on X"
            Icon={XIcon}
          />
          <Resource
            href="https://github.com/webstudio-is/webstudio-community/discussions"
            title="Discuss on GitHub"
            Icon={GithubIcon}
          />
        </Grid>
      </Flex>
    </Panel>
  );
};
