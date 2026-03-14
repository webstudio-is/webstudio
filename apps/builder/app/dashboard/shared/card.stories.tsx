import { Text, theme } from "@webstudio-is/design-system";
import { Card, CardContent, CardFooter } from "./card";

export default {
  title: "Builder/Dashboard/Card",
  component: Card,
};

export const Basic = () => (
  <div style={{ width: 280 }}>
    <Card>
      <CardContent
        css={{ background: theme.colors.brandBackgroundProjectCardFront }}
      />
      <CardFooter>
        <Text truncate>My project</Text>
      </CardFooter>
    </Card>
  </div>
);

export const Selected = () => (
  <div style={{ width: 280 }}>
    <Card aria-selected={true}>
      <CardContent
        css={{ background: theme.colors.brandBackgroundProjectCardFront }}
      />
      <CardFooter>
        <Text truncate>Selected project</Text>
      </CardFooter>
    </Card>
  </div>
);

export const Multiple = () => (
  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
    {["Project Alpha", "My Website", "Landing Page"].map((title) => (
      <div key={title} style={{ width: 280 }}>
        <Card>
          <CardContent
            css={{ background: theme.colors.brandBackgroundProjectCardFront }}
          />
          <CardFooter>
            <Text truncate>{title}</Text>
          </CardFooter>
        </Card>
      </div>
    ))}
  </div>
);
