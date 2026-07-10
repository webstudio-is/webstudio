import { useVariableState } from "@webstudio-is/react-sdk/runtime";
import { Box as Box, Form as Form } from "../components";

const Component = () => {
  let [formState, set$formState] = useVariableState<any>("initial");
  return (
    <Box className={`w-box`}>
      <Form
        state={formState}
        onStateChange={(state: any) => {
          formState = state;
          set$formState(formState);
        }}
        className={`w-webhook-form`}
      >
        {(formState === "initial" || formState === "error") && (
          <div className={`w-element`}>
            <label className={`w-element w-element-1`}>{"Name"}</label>
            <input name={"name"} className={`w-element w-element-2`} />
            <label className={`w-element w-element-3`}>{"Email"}</label>
            <input name={"email"} className={`w-element w-element-4`} />
            <button className={`w-element`}>{"Submit"}</button>
          </div>
        )}
        {formState === "success" && (
          <div className={`w-element`}>{"Thank you for getting in touch!"}</div>
        )}
        {formState === "error" && (
          <div className={`w-element`}>{"Sorry, something went wrong."}</div>
        )}
      </Form>
    </Box>
  );
};

export default {
  title: "Components/Form",
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
  form.w-webhook-form {
    box-sizing: border-box
  }
  button.w-element {
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
  div.w-element {
    box-sizing: border-box
  }
  input.w-element {
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    box-sizing: border-box;
    border-top-style: solid;
    border-right-style: solid;
    border-bottom-style: solid;
    border-left-style: solid;
    margin: 0
  }
  label.w-element {
    box-sizing: border-box
  }
}
@media all {
  .w-element-1 {
    display: block
  }
  .w-element-2 {
    display: block
  }
  .w-element-3 {
    display: block
  }
  .w-element-4 {
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

export { Story as Form };
