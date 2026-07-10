import { Box as Box, ListItem as ListItem } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <ListItem className={`w-list-item`}>{"Review queue health"}</ListItem>
    </Box>
  );
};

export default {
  title: "Components/ListItem",
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

export { Story as ListItem };
