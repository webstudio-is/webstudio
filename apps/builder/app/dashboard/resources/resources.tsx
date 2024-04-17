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
  XIcon,
  Youtube1cIcon,
  type IconComponent,
  WebstudioIcon,
} from "@webstudio-is/icons";
import { Card, CardContent, CardFooter } from "../shared/card";
import { Panel } from "../shared/panel";
import { IntroVideoDialog } from "./intro-video";
import introThumb from "./intro-thumb.jpg";

const introButtonStyle = css({
  "&:hover, &:focus-visible": {
    "--ws-resource-intro-video-filter": "none",
  },
});

const introThumbStyle = css({
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "center",
  filter: "var(--ws-resource-intro-video-filter, brightness(80%))",
});

const IntroVideoCard = () => {
  return (
    <IntroVideoDialog asChild>
      <Card asChild>
        <button className={introButtonStyle()}>
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
  width: "35%",
  height: "auto",
  filter: "var(--ws-resource-icon-filter, opacity(0.8) brightness(80%))",
});

const Resource = ({
  href,
  Icon,
  title,
  color,
}: {
  href: string;
  Icon: IconComponent;
  title: string;
  color?: string;
}) => {
  return (
    <Card asChild>
      <Link
        href={href}
        target="_blank"
        underline="none"
        css={{
          "&:hover, &:focus-visible": {
            "--ws-resource-icon-filter": "none",
          },
        }}
      >
        <CardContent>
          <Flex align="center" justify="center">
            <Icon className={resourceIconSyle({ css: { color } })} />
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
            color="#FF0000"
          />
          <Resource
            href="https://docs.webstudio.is/"
            title="Read the Docs"
            Icon={WebstudioIcon}
          />
          <Resource
            href="https://discord.gg/UNdyrDkq5r"
            title="Join the Community"
            Icon={DiscordIcon}
            color="#5865F2"
          />
          <Resource
            href="https://x.com/getwebstudio"
            title="Follow on X"
            Icon={XIcon}
            color={theme.colors.foregroundMain}
          />
          <Resource
            href="https://github.com/webstudio-is/webstudio-community/discussions"
            title="Discuss on GitHub"
            Icon={GithubIcon}
            color={theme.colors.foregroundMain}
          />
        </Grid>
      </Flex>
    </Panel>
  );
};
