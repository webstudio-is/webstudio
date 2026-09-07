import { useState } from "react";
import { Grid } from "./grid";
import { InsetList, InsetListItem } from "./inset-list";
import { List, ListItem } from "./primitives/list";
import { StorySection } from "./storybook";
import { Text } from "./text";
import { theme } from "../stitches.config";

export default {
  title: "Inset list",
};

const items = ["General", "Publishing", "Authentication"];

export const Navigation = () => {
  const [current, setCurrent] = useState(items[0]);
  return (
    <StorySection title="Navigation">
      <List asChild aria-label="Project settings sections">
        <InsetList css={{ width: 220 }}>
          {items.map((item, index) => (
            <ListItem
              key={item}
              asChild
              index={index}
              current={item === current}
              onSelect={() => setCurrent(item)}
            >
              <InsetListItem>{item}</InsetListItem>
            </ListItem>
          ))}
        </InsetList>
      </List>
    </StorySection>
  );
};

export const SupportingText = () => (
  <StorySection title="Supporting text">
    <List asChild aria-label="Collection fields">
      <InsetList css={{ width: 220 }}>
        <ListItem asChild index={0} current>
          <InsetListItem css={{ minHeight: theme.spacing[15] }}>
            <Grid gap={1} css={{ minWidth: 0 }}>
              <Text variant="labels">Title</Text>
              <Text variant="tiny" color="subtle">
                Text · Required
              </Text>
            </Grid>
          </InsetListItem>
        </ListItem>
      </InsetList>
    </List>
  </StorySection>
);

export const Columns = () => (
  <StorySection title="Columns">
    <List asChild aria-label="Projects">
      <InsetList css={{ width: 520 }}>
        {["Starter", "Portfolio"].map((name, index) => (
          <ListItem asChild index={index} key={name}>
            <InsetListItem css={{ gridTemplateColumns: "2fr 1fr 1fr", gap: 0 }}>
              <Text variant="labels">{name}</Text>
              <Text color="subtle">Today</Text>
              <Text color="subtle">Published</Text>
            </InsetListItem>
          </ListItem>
        ))}
      </InsetList>
    </List>
  </StorySection>
);
