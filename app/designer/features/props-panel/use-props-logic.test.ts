import { renderHook, act } from "@testing-library/react-hooks";
import { SelectedInstanceData } from "~/shared/canvas-components";
import { usePropsLogic } from "./use-props-logic";

const selectedInstanceData = {
  id: "2",
  component: "Button",
  cssRules: [],
  browserStyle: {},
  props: {
    id: "1",
    props: [
      {
        id: "disabled",
        prop: "disabled",
        value: true,
      },
    ],
    instanceId: "2",
    treeId: "1",
  },
} as SelectedInstanceData;

describe("usePropsLogic", () => {
  test("should return initial props for a given instance", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        selectedInstanceData,
        publish: jest.fn(),
      })
    );
    expect(result.current.userProps).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "disabled",
          "prop": "disabled",
          "value": true,
        },
      ]
    `);
  });

  test("should add an empty prop", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        selectedInstanceData,
        publish: jest.fn(),
      })
    );

    expect(result.current.userProps.length).toEqual(1);

    act(() => {
      result.current.addEmptyProp();
    });

    expect(result.current.userProps.length).toEqual(2);
    expect(result.current.userProps[1]).toMatchObject({ prop: "", value: "" });
  });

  test("should remove a prop", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        selectedInstanceData,
        publish: jest.fn(),
      })
    );

    act(() => {
      result.current.handleDeleteProp("disabled");
    });

    expect(result.current.userProps.length).toEqual(0);
    expect(result.current.userProps).toMatchInlineSnapshot(`Array []`);
  });

  test("should add update a prop", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        selectedInstanceData,
        publish: jest.fn(),
      })
    );

    act(() => {
      result.current.handleChangeProp("disabled", "prop", "disabled2");
    });

    act(() => {
      result.current.handleChangeProp("disabled", "value", false);
    });

    expect(result.current.userProps).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "disabled",
          "prop": "disabled2",
          "value": false,
        },
      ]
    `);
  });
});
