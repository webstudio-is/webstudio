import { jest, describe, test, expect } from "@jest/globals";
import { renderHook, act } from "@testing-library/react-hooks";
import { ComponentName, getComponentMeta } from "@webstudio-is/react-sdk";
import { nanoid } from "nanoid";
import type { SelectedInstanceData } from "@webstudio-is/project";
import { usePropsLogic } from "./use-props-logic";

const getSelectedInstanceData = (
  componentName: ComponentName
): SelectedInstanceData => {
  return {
    id: nanoid(8),
    component: componentName,
    browserStyle: {},
  };
};

describe("usePropsLogic", () => {
  test("should return required props", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        props: [],
        selectedInstanceData: getSelectedInstanceData("Link"),
        updateProps: jest.fn(),
        deleteProp: jest.fn(),
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
        props: [],
        selectedInstanceData: getSelectedInstanceData("Heading"),
        updateProps: jest.fn(),
        deleteProp: jest.fn(),
      })
    );
    const { result: res2 } = renderHook(() =>
      usePropsLogic({
        props: [],
        selectedInstanceData: getSelectedInstanceData("Button"),
        updateProps: jest.fn(),
        deleteProp: jest.fn(),
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
        props: [],
        selectedInstanceData: getSelectedInstanceData("Button"),
        updateProps: jest.fn(),
        deleteProp: jest.fn(),
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
        props: [
          {
            id: "default",
            prop: "type",
            type: "string",
            value: "submit",
          },
        ],
        selectedInstanceData: getSelectedInstanceData("Button"),
        updateProps: jest.fn(),
        deleteProp: jest.fn(),
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
        props: [],
        selectedInstanceData: getSelectedInstanceData("Box"),
        updateProps: jest.fn(),
        deleteProp: jest.fn(),
      })
    );

    expect(result.current.userProps.length).toEqual(1);

    act(() => {
      result.current.addEmptyProp();
    });

    expect(result.current.userProps.length).toEqual(2);
    expect(result.current.userProps[1]).toMatchObject({ prop: "", value: "" });
  });

  test("should respect initialProps ordering", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        props: [
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
        ],
        selectedInstanceData: getSelectedInstanceData("Image"),
        updateProps: jest.fn(),
        deleteProp: jest.fn(),
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
        props: [],
        selectedInstanceData: getSelectedInstanceData("Image"),
        updateProps: jest.fn(),
        deleteProp: jest.fn(),
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
        props: [],
        selectedInstanceData: getSelectedInstanceData("Image"),
        updateProps: jest.fn(),
        deleteProp: jest.fn(),
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
