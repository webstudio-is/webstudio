import { Box, Flex, Text, theme } from "@webstudio-is/design-system";
import { Card, CardContent, CardFooter } from "./card";

export default {
  title: "Dashboard/Card",
  component: Card,
};

export const Card = () => (
  <Flex gap="3" wrap="wrap" align="start">
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
