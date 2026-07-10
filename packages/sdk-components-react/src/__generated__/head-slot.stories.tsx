import {
  Box as Box,
  HeadSlot as HeadSlot,
  HeadTitle as HeadTitle,
  HeadLink as HeadLink,
  HeadMeta as HeadMeta,
} from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <HeadSlot>
        <HeadTitle>{"Title"}</HeadTitle>
        <HeadLink rel={"help"} href={"/help"} />
        <HeadMeta name={"keywords"} content={"SEO"} />
      </HeadSlot>
    </Box>
  );
};

export default {
  title: "Components/HeadSlot",
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
}

      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as HeadSlot };
