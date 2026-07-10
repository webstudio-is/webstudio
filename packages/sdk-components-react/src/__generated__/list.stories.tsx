import { Box as Box, List as List, ListItem as ListItem } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <List className={`w-list`}>
        <ListItem className={`w-list-item`}>
          {"Triage incoming requests"}
        </ListItem>
        <ListItem className={`w-list-item`}>{"Assign an owner"}</ListItem>
        <ListItem className={`w-list-item`}>{"Resolve before SLA"}</ListItem>
      </List>
    </Box>
  );
};

export default {
  title: "Components/List",
};

const Story = {
  render() {
    return (
      <>
        <style>
          {`
@layer presets {
  div.w-box {
    box-sizing: border-box
  }
  ol.w-list {
    box-sizing: border-box;
    margin-top: 0;
    margin-bottom: 10px;
    padding-left: 40px
  }
  li.w-list-item {
    box-sizing: border-box
  }
}

      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as List };
