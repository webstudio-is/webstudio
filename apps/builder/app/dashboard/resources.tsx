import {
  Flex,
  Grid,
  Link,
  Text,
  rawTheme,
  theme,
} from "@webstudio-is/design-system";
import { Card, CardContent, CardFooter } from "./card";
import {
  DiscordIcon,
  GithubIcon,
  Webstudio1cIcon,
  XIcon,
  Youtube1cIcon,
  type IconComponent,
} from "@webstudio-is/icons";
import { Panel } from "./panel";

const Resource = ({
  href,
  Icon,
  title,
}: {
  href: string;
  Icon: IconComponent;
  title: string;
}) => {
  return (
    <Link
      href={href}
      target="_blank"
      underline="none"
      color="subtle"
      css={{
        "&:hover, &:focus-visible": {
          color: theme.colors.foregroundMain,
        },
      }}
    >
      <Card>
        <CardContent>
          <Flex align="center" justify="center">
            <Icon size="50%" />
          </Flex>
        </CardContent>
        <CardFooter>
          <Flex justify="center" align="center" direction="column" grow>
            <Text variant="titles" align="center" color="main">
              {title}
            </Text>
          </Flex>
        </CardFooter>
      </Card>
    </Link>
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
          <Resource
            href="https://www.youtube.com/playlist?list=PL4vVqpngzeT4sDlanyPe99dYl8BgUYCac"
            title="Learn with Videos"
            Icon={Youtube1cIcon}
          />
          <Resource
            href="https://docs.webstudio.is/"
            title="Read the Docs"
            Icon={Webstudio1cIcon}
          />
          <Resource
            href="https://discord.gg/UNdyrDkq5r"
            title="Join the Community"
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
