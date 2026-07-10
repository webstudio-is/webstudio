import { Box as Box, Select as Select, Option as Option } from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Select className={`w-select w-select-1`}>
        <Option
          label={"Please choose an option"}
          value={""}
          className={`w-option`}
        />
        <Option label={"Option A"} value={"a"} className={`w-option`} />
        <Option label={"Option B"} value={"b"} className={`w-option`} />
        <Option label={"Option C"} value={"c"} className={`w-option`} />
      </Select>
    </Box>
  );
};

export default {
  title: "Components/Select",
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
  option.w-option:checked {
    background-color: rgb(209 209 209 / 1)
  }
  select.w-select {
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    box-sizing: border-box;
    border-top-style: solid;
    border-right-style: solid;
    border-bottom-style: solid;
    border-left-style: solid;
    text-transform: none;
    display: block;
    margin: 0
  }
}
@media all {
  .w-select-1 {
    display: block
  }
}
      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Select };
