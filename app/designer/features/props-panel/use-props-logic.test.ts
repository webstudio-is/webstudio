import { renderHook, act } from "@testing-library/react-hooks";
import { components, UserProp } from "@webstudio-is/sdk";
import { nanoid } from "nanoid";
import { SelectedInstanceData } from "~/shared/canvas-components";
import { usePropsLogic } from "./use-props-logic";

const getSelectedInstanceData = (
  componentName: keyof typeof components,
  props: UserProp[]
): SelectedInstanceData => {
  return {
    id: nanoid(8),
    component: componentName,
    cssRules: [],
    browserStyle: {},
    props: {
      id: nanoid(8),
      props,
      instanceId: nanoid(8),
      treeId: nanoid(8),
    },
  };
};

describe("usePropsLogic", () => {
  test("should return required props", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        selectedInstanceData: getSelectedInstanceData("Link", []),
        publish: jest.fn(),
      })
    );
    expect(result.current.userProps.length).toEqual(1);
    expect(result.current.userProps[0]).toMatchObject({
      prop: "href",
      value: "",
      required: true,
    });
  });

  test("should return different default props for different instances", () => {
    const { result: res1 } = renderHook(() =>
      usePropsLogic({
        selectedInstanceData: getSelectedInstanceData("Heading", []),
        publish: jest.fn(),
      })
    );
    const { result: res2 } = renderHook(() =>
      usePropsLogic({
        selectedInstanceData: getSelectedInstanceData("Button", []),
        publish: jest.fn(),
      })
    );
    expect(res1.current.userProps[0]).toBeUndefined();
    expect(res2.current.userProps[0]).toMatchObject({
      prop: "type",
      value: "submit",
    });
  });

  test("should return props with defaultValue set", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        selectedInstanceData: getSelectedInstanceData("Button", []),
        publish: jest.fn(),
      })
    );
    expect(result.current.userProps.length).toEqual(1);
    expect(result.current.userProps[0]).toMatchObject({
      prop: "type",
      value: "submit",
    });
  });

  test("should dedupe by prop name and user props take precedence ", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        selectedInstanceData: getSelectedInstanceData("Button", [
          {
            id: "default",
            prop: "type",
            value: "submit",
          },
        ]),
        publish: jest.fn(),
      })
    );
    expect(result.current.userProps.length).toEqual(1);
    expect(result.current.userProps[0]).toMatchObject({
      prop: "type",
      value: "submit",
    });
  });

  test("should add an empty prop", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        selectedInstanceData: getSelectedInstanceData("Box", []),
        publish: jest.fn(),
      })
    );

    expect(result.current.userProps.length).toEqual(0);

    act(() => {
      result.current.addEmptyProp();
    });

    expect(result.current.userProps.length).toEqual(1);
    expect(result.current.userProps[0]).toMatchObject({ prop: "", value: "" });
  });

  test("should remove a prop", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        selectedInstanceData: getSelectedInstanceData("Box", [
          {
            id: "disabled",
            prop: "disabled",
            value: "true",
          },
        ]),
        publish: jest.fn(),
      })
    );

    act(() => {
      result.current.handleDeleteProp("disabled");
    });

    expect(result.current.userProps.length).toEqual(0);
    expect(result.current.userProps).toMatchInlineSnapshot(`Array []`);
  });

  test("should update a prop", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        selectedInstanceData: getSelectedInstanceData("Box", [
          {
            id: "disabled",
            prop: "disabled",
            value: "true",
          },
        ]),
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

  test("should not remove a required prop", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        selectedInstanceData: getSelectedInstanceData("Box", [
          {
            id: "disabled",
            prop: "disabled",
            value: "true",
            required: true,
          },
        ]),
        publish: jest.fn(),
      })
    );

    expect(result.current.userProps.length).toEqual(1);

    act(() => {
      result.current.handleDeleteProp("disabled");
    });

    expect(result.current.userProps.length).toEqual(1);
    expect(result.current.userProps).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "disabled",
          "prop": "disabled",
          "required": true,
          "value": "true",
        },
      ]
    `);
  });

  test("should not update a required prop name", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        selectedInstanceData: getSelectedInstanceData("Box", [
          {
            id: "test",
            prop: "test",
            value: "test",
            required: true,
          },
        ]),
        publish: jest.fn(),
      })
    );

    act(() => {
      result.current.handleChangeProp("test", "prop", "test-example");
    });

    expect(result.current.userProps).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "test",
          "prop": "test",
          "required": true,
          "value": "test",
        },
      ]
    `);
  });

  test("should update a required prop value", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        selectedInstanceData: getSelectedInstanceData("Box", [
          {
            id: "test",
            prop: "test",
            value: true,
            required: true,
          },
        ]),
        publish: jest.fn(),
      })
    );

    act(() => {
      result.current.handleChangeProp("test", "value", false);
    });

    expect(result.current.userProps).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "test",
          "prop": "test",
          "required": true,
          "value": false,
        },
      ]
    `);
  });
});
