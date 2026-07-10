import { Box as Box, Time as Time } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Time datetime={"2026-07-06T09:00:00Z"} className={`w-time`}>
        {"Jul 6, 2026, 09:00"}
      </Time>
    </Box>
  );
};

export default {
  title: "Components/Time",
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
  time.w-time {
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

export { Story as Time };
