import { jest, describe, test, expect } from "@jest/globals";
import { renderHook, act } from "@testing-library/react-hooks";
import {
  ComponentName,
  getComponentMeta,
  UserProp,
} from "@webstudio-is/react-sdk";
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
    browserStyle: {},
    props,
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
            type: "string",
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
            type: "string",
            value: "div",
            required: true,
          },
          {
            id: "disabled",
            prop: "disabled",
            type: "boolean",
            value: true,
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
          "type": "string",
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
            type: "string",
            value: "div",
            required: true,
          },
          {
            id: "disabled",
            prop: "disabled",
            type: "boolean",
            value: true,
          },
        ]),
        publish: jest.fn(),
      })
    );

    act(() => {
      result.current.handleChangePropName("disabled", "disabled2");
    });

    act(() => {
      result.current.handleChangePropValue("disabled", {
        type: "boolean",
        value: false,
      });
    });

    expect(result.current.userProps).toMatchInlineSnapshot(`
      [
        {
          "id": "1",
          "prop": "tag",
          "required": true,
          "type": "string",
          "value": "div",
        },
        {
          "id": "disabled",
          "prop": "disabled2",
          "type": "boolean",
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
            type: "string",
            value: "div",
            required: true,
          },
          {
            id: "disabled",
            prop: "disabled",
            type: "boolean",
            value: true,
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
          "type": "string",
          "value": "div",
        },
        {
          "id": "disabled",
          "prop": "disabled",
          "required": true,
          "type": "boolean",
          "value": true,
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
            type: "string",
            value: "div",
            required: true,
          },
          {
            id: "2",
            prop: "test",
            type: "string",
            value: "test",
            required: true,
          },
        ]),
        publish: jest.fn(),
      })
    );

    act(() => {
      result.current.handleChangePropName("2", "test-example");
    });

    expect(result.current.userProps).toMatchInlineSnapshot(`
      [
        {
          "id": "1",
          "prop": "tag",
          "required": true,
          "type": "string",
          "value": "div",
        },
        {
          "id": "2",
          "prop": "test",
          "required": true,
          "type": "string",
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
            type: "string",
            value: "div",
            required: true,
          },
          {
            id: "2",
            prop: "test",
            type: "boolean",
            value: true,
            required: true,
          },
        ]),
        publish: jest.fn(),
      })
    );

    act(() => {
      result.current.handleChangePropValue("2", {
        type: "boolean",
        value: false,
      });
    });

    expect(result.current.userProps).toMatchInlineSnapshot(`
      [
        {
          "id": "1",
          "prop": "tag",
          "required": true,
          "type": "string",
          "value": "div",
        },
        {
          "id": "2",
          "prop": "test",
          "required": true,
          "type": "boolean",
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
            type: "string",
            value: "div",
            required: true,
          },
        ]),
        publish: jest.fn(),
      })
    );

    act(() => {
      result.current.handleChangePropValue("1", {
        type: "string",
        value: "img",
      });
    });

    expect(result.current.userProps).toMatchInlineSnapshot(`
      [
        {
          "id": "1",
          "prop": "tag",
          "required": true,
          "type": "string",
          "value": "img",
        },
      ]
    `);

    act(() => {
      result.current.handleChangePropValue("1", {
        type: "asset",
        value: {
          type: "image",
          id: "string",
          projectId: "string",
          format: "string",
          size: 1111,
          name: "string",
          description: "string",
          location: "REMOTE",
          createdAt: new Date("1995-12-17T03:24:00Z").toISOString(),
          meta: { width: 101, height: 202 },
          path: "string",
        },
      });
    });

    expect(result.current.userProps).toMatchInlineSnapshot(`
      [
        {
          "id": "1",
          "prop": "tag",
          "required": true,
          "type": "asset",
          "value": {
            "createdAt": "1995-12-17T03:24:00.000Z",
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
            "type": "image",
          },
        },
      ]
    `);

    act(() => {
      result.current.handleChangePropValue("1", {
        type: "string",
        value: "img-3",
      });
    });

    expect(result.current.userProps).toMatchInlineSnapshot(`
      [
        {
          "id": "1",
          "prop": "tag",
          "required": true,
          "type": "string",
          "value": "img-3",
        },
      ]
    `);
  });

  test("should respect initialProps ordering", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        selectedInstanceData: getSelectedInstanceData("Image", [
          {
            id: "22",
            prop: "aria-label",
            type: "string",
            value: "https://example.com",
            required: false,
          },
          {
            id: "0",
            prop: "alt",
            type: "string",
            value: "alt text",
            required: true,
          },
          {
            id: "1",
            prop: "width",
            type: "number",
            value: 101,
            required: false,
          },
          {
            id: "33",
            prop: "title",
            type: "string",
            value: "title text",
            required: true,
          },
          {
            id: "2",
            prop: "src",
            type: "string",
            value: "https://example.com",
            required: true,
          },
        ]),
        publish: jest.fn(),
      })
    );

    const imgMeta = getComponentMeta("Image");

    const propNames = result.current.userProps.map((userProp) => userProp.prop);

    expect(imgMeta.initialProps).toEqual(
      propNames.slice(0, imgMeta.initialProps?.length ?? 0)
    );

    expect(propNames.slice(imgMeta.initialProps?.length ?? 0)).toEqual(
      result.current.userProps
        .filter(
          (userProp) => imgMeta.initialProps?.includes(userProp.prop) === false
        )
        .map((userProp) => userProp.prop)
    );
  });

  test("should return isRequired true for initial props", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        selectedInstanceData: getSelectedInstanceData("Image", []),
        publish: jest.fn(),
      })
    );

    expect(
      result.current.isRequired({
        id: "2",
        prop: "src",
        type: "string",
        value: "https://example.com",
        required: false,
      })
    ).toBe(true);
  });

  test("isRequired should respect required prop", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        selectedInstanceData: getSelectedInstanceData("Image", []),
        publish: jest.fn(),
      })
    );

    expect(
      result.current.isRequired({
        id: "2",
        prop: "arial-label",
        type: "string",
        value: "https://example.com",
        required: true,
      })
    ).toBe(true);

    expect(
      result.current.isRequired({
        id: "2",
        prop: "arial-label",
        type: "string",
        value: "https://example.com",
        required: false,
      })
    ).toBe(false);
  });
});
