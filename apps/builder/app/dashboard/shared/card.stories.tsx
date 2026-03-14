import { Box, Flex, Text, theme } from "@webstudio-is/design-system";
import { Card, CardContent, CardFooter } from "./card";

export default {
  title: "Dashboard/Card",
  component: Card,
};

export const Basic = () => (
  <Box css={{ width: theme.spacing[30] }}>
    <Card>
      <CardContent
        css={{ background: theme.colors.brandBackgroundProjectCardFront }}
      />
      <CardFooter>
        <Text truncate>My project</Text>
      </CardFooter>
    </Card>
  </Box>
);

export const Selected = () => (
  <Box css={{ width: theme.spacing[30] }}>
    <Card aria-selected={true}>
      <CardContent
        css={{ background: theme.colors.brandBackgroundProjectCardFront }}
      />
      <CardFooter>
        <Text truncate>Selected project</Text>
      </CardFooter>
    </Card>
  </Box>
);

export const Multiple = () => (
  <Flex gap="3" wrap="wrap">
    {["Project Alpha", "My Website", "Landing Page"].map((title) => (
      <Box key={title} css={{ width: theme.spacing[30] }}>
        <Card>
          <CardContent
            css={{ background: theme.colors.brandBackgroundProjectCardFront }}
          />
          <CardFooter>
            <Text truncate>{title}</Text>
          </CardFooter>
        </Card>
      </Box>
    ))}
  </Flex>
);
