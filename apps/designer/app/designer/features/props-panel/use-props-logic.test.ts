import { renderHook, act } from "@testing-library/react-hooks";
import { type ComponentName, UserProp } from "@webstudio-is/react-sdk";
import { nanoid } from "nanoid";
import type { SelectedInstanceData } from "@webstudio-is/project";
import { usePropsLogic } from "./use-props-logic";

const getSelectedInstanceData = (
  componentName: ComponentName,
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
    expect(res1.current.userProps[0]).toMatchObject({
      prop: "tag",
      value: "h1",
    });
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
        selectedInstanceData: getSelectedInstanceData("Box", [
          {
            id: "1",
            prop: "tag",
            value: "div",
            required: true,
          },
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

    expect(result.current.userProps.length).toEqual(1);
    expect(result.current.userProps).toMatchInlineSnapshot(`
      [
        {
          "id": "1",
          "prop": "tag",
          "required": true,
          "value": "div",
        },
      ]
    `);
  });

  test("should update a prop", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        selectedInstanceData: getSelectedInstanceData("Box", [
          {
            id: "1",
            prop: "tag",
            value: "div",
            required: true,
          },
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
      result.current.handleChangePropName("disabled", "disabled2", false);
    });

    act(() => {
      result.current.handleChangePropValue("disabled", false);
    });

    expect(result.current.userProps).toMatchInlineSnapshot(`
      [
        {
          "id": "1",
          "prop": "tag",
          "required": true,
          "value": "div",
        },
        {
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
            id: "1",
            prop: "tag",
            value: "div",
            required: true,
          },
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

    expect(result.current.userProps.length).toEqual(2);

    act(() => {
      result.current.handleDeleteProp("disabled");
    });

    expect(result.current.userProps.length).toEqual(2);
    expect(result.current.userProps).toMatchInlineSnapshot(`
      [
        {
          "id": "1",
          "prop": "tag",
          "required": true,
          "value": "div",
        },
        {
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
            id: "1",
            prop: "tag",
            value: "div",
            required: true,
          },
          {
            id: "2",
            prop: "test",
            value: "test",
            required: true,
          },
        ]),
        publish: jest.fn(),
      })
    );

    act(() => {
      result.current.handleChangePropName("2", "test-example", "");
    });

    expect(result.current.userProps).toMatchInlineSnapshot(`
      [
        {
          "id": "1",
          "prop": "tag",
          "required": true,
          "value": "div",
        },
        {
          "id": "2",
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
            id: "1",
            prop: "tag",
            value: "div",
            required: true,
          },
          {
            id: "2",
            prop: "test",
            value: true,
            required: true,
          },
        ]),
        publish: jest.fn(),
      })
    );

    act(() => {
      result.current.handleChangePropValue("2", false);
    });

    expect(result.current.userProps).toMatchInlineSnapshot(`
      [
        {
          "id": "1",
          "prop": "tag",
          "required": true,
          "value": "div",
        },
        {
          "id": "2",
          "prop": "test",
          "required": true,
          "value": false,
        },
      ]
    `);
  });

  test("should update value and asset", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        selectedInstanceData: getSelectedInstanceData("Box", [
          {
            id: "1",
            prop: "tag",
            value: "div",
            required: true,
          },
        ]),
        publish: jest.fn(),
      })
    );

    act(() => {
      result.current.handleChangePropValue("1", "img", {
        id: "string",
        projectId: "string",
        format: "string",
        size: 1111,
        name: "string",
        description: "string",
        location: "REMOTE",
        createdAt: new Date("1995-12-17T03:24:00Z"),
        meta: { width: 101, height: 202 },
        path: "string",
        status: "uploaded",
      });
    });

    expect(result.current.userProps).toMatchInlineSnapshot(`
      [
        {
          "asset": {
            "createdAt": 1995-12-17T03:24:00.000Z,
            "description": "string",
            "format": "string",
            "id": "string",
            "location": "REMOTE",
            "meta": {
              "height": 202,
              "width": 101,
            },
            "name": "string",
            "path": "string",
            "projectId": "string",
            "size": 1111,
            "status": "uploaded",
          },
          "id": "1",
          "prop": "tag",
          "required": true,
          "value": "img",
        },
      ]
    `);

    act(() => {
      result.current.handleChangePropValue("1", "img");
    });

    expect(result.current.userProps).toMatchInlineSnapshot(`
      [
        {
          "id": "1",
          "prop": "tag",
          "required": true,
          "value": "img",
        },
      ]
    `);
  });
});
