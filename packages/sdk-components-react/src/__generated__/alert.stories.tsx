import {
  Box as Box,
  Alert as Alert,
  Paragraph as Paragraph,
} from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Alert variant={"note"} className={`w-alert`}>
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
  div.w-alert {
    box-sizing: border-box;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
    border-bottom-left-radius: 8px;
    padding: 16px
  }
  div.w-alert[data-state="caution"] {
    background-color: rgb(254 226 226 / 1)
  }
  div.w-alert[data-state="important"] {
    background-color: rgb(238 242 255 / 1)
  }
  div.w-alert[data-state="note"] {
    background-color: rgb(239 246 255 / 1)
  }
  div.w-alert[data-state="tip"] {
    background-color: rgb(236 253 245 / 1)
  }
  div.w-alert[data-state="warning"] {
    background-color: rgb(254 243 199 / 1)
  }
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
