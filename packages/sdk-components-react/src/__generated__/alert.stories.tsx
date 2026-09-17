import {
  Box as Box,
  Alert as Alert,
  Paragraph as Paragraph,
} from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Alert variant={"note"} className={`w-alert w-alert-1`}>
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
    box-sizing: border-box
  }
  div.w-box {
    box-sizing: border-box
  }
  p.w-paragraph {
    box-sizing: border-box
  }
}
@media all {
  .w-alert-1 {
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
    border-bottom-left-radius: 8px;
    padding: 16px
  }
  .w-alert-1[data-state="caution"] {
    background-color: #faf5ff
  }
  .w-alert-1[data-state="important"] {
    background-color: #eef2ff
  }
  .w-alert-1[data-state="note"] {
    background-color: #eff6ff
  }
  .w-alert-1[data-state="tip"] {
    background-color: #ecfeff
  }
  .w-alert-1[data-state="warning"] {
    background-color: #f5f3ff
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
