import {
  Box as Box,
  Alert as Alert,
  Paragraph as Paragraph,
} from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Alert variant={"note"}>
        <Paragraph className={`w-paragraph`}>
          {"Add helpful context here."}
        </Paragraph>
      </Alert>
    </Box>
  );
};

export default {
  title: "Components/Alert",
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
  p.w-paragraph {
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

export { Story as Alert };
