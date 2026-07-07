import {
  Box as Box,
  RemixForm as RemixForm,
  Label as Label,
  Input as Input,
  Button as Button,
} from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <RemixForm className={`w-form`}>
        <Label className={`w-input-label`}>{"Search"}</Label>
        <Input
          name={"query"}
          placeholder={"Find a ticket"}
          className={`w-text-input`}
        />
        <Button className={`w-button`}>{"Search"}</Button>
      </RemixForm>
    </Box>
  );
};

export default {
  title: "Components/RemixForm",
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
  button.w-button {
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    box-sizing: border-box;
    border-top-style: solid;
    border-right-style: solid;
    border-bottom-style: solid;
    border-left-style: solid;
    text-transform: none;
    margin: 0
  }
  input.w-text-input {
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    box-sizing: border-box;
    border-top-style: solid;
    border-right-style: solid;
    border-bottom-style: solid;
    border-left-style: solid;
    display: block;
    margin: 0
  }
  label.w-input-label {
    box-sizing: border-box;
    display: block
  }
  form.w-form {
    box-sizing: border-box;
    min-height: 20px
  }
}

      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as RemixForm };
