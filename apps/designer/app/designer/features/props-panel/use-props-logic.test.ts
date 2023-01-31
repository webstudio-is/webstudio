import { jest, describe, test, expect } from "@jest/globals";
import { renderHook, act } from "@testing-library/react-hooks";
import type { Instance } from "@webstudio-is/project-build";
import { getComponentMeta } from "@webstudio-is/react-sdk";
import { nanoid } from "nanoid";
import { usePropsLogic } from "./use-props-logic";

const getSelectedInstance = (componentName: string): Instance => {
  return {
    type: "instance",
    id: nanoid(8),
    component: componentName,
    children: [],
  };
};

describe("usePropsLogic", () => {
  test("should return required props", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        props: [],
        selectedInstance: getSelectedInstance("Link"),
        updateProps: jest.fn(),
        deleteProp: jest.fn(),
      })
    );
    expect(result.current.userProps.length).toEqual(1);
    expect(result.current.userProps[0]).toMatchObject({
      name: "href",
      value: "",
    });
  });

  test("should return different default props for different instances", () => {
    const { result: res1 } = renderHook(() =>
      usePropsLogic({
        props: [],
        selectedInstance: getSelectedInstance("Heading"),
        updateProps: jest.fn(),
        deleteProp: jest.fn(),
      })
    );
    const { result: res2 } = renderHook(() =>
      usePropsLogic({
        props: [],
        selectedInstance: getSelectedInstance("Button"),
        updateProps: jest.fn(),
        deleteProp: jest.fn(),
      })
    );
    expect(res1.current.userProps[0]).toMatchObject({
      name: "tag",
      value: "h1",
    });
    expect(res2.current.userProps[0]).toMatchObject({
      name: "type",
      value: "submit",
    });
  });

  test("should return props with defaultValue set", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        props: [],
        selectedInstance: getSelectedInstance("Button"),
        updateProps: jest.fn(),
        deleteProp: jest.fn(),
      })
    );
    expect(result.current.userProps.length).toEqual(1);
    expect(result.current.userProps[0]).toMatchObject({
      name: "type",
      value: "submit",
    });
  });

  test("should dedupe by prop name and user props take precedence ", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        props: [
          {
            id: "default",
            instanceId: "instanceId",
            name: "type",
            type: "string",
            value: "submit",
          },
        ],
        selectedInstance: getSelectedInstance("Button"),
        updateProps: jest.fn(),
        deleteProp: jest.fn(),
      })
    );
    expect(result.current.userProps.length).toEqual(1);
    expect(result.current.userProps[0]).toMatchObject({
      name: "type",
      value: "submit",
    });
  });

  test("should add an empty prop", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        props: [],
        selectedInstance: getSelectedInstance("Box"),
        updateProps: jest.fn(),
        deleteProp: jest.fn(),
      })
    );

    expect(result.current.userProps.length).toEqual(1);

    act(() => {
      result.current.addEmptyProp();
    });

    expect(result.current.userProps.length).toEqual(2);
    expect(result.current.userProps[1]).toMatchObject({ name: "", value: "" });
  });

  test("should respect initialProps ordering", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        props: [
          {
            id: "22",
            instanceId: "instanceId",
            name: "aria-label",
            type: "string",
            value: "https://example.com",
            required: false,
          },
          {
            id: "0",
            instanceId: "instanceId",
            name: "alt",
            type: "string",
            value: "alt text",
            required: true,
          },
          {
            id: "1",
            instanceId: "instanceId",
            name: "width",
            type: "number",
            value: 101,
            required: false,
          },
          {
            id: "33",
            instanceId: "instanceId",
            name: "title",
            type: "string",
            value: "title text",
            required: true,
          },
          {
            id: "2",
            instanceId: "instanceId",
            name: "src",
            type: "string",
            value: "https://example.com",
            required: true,
          },
        ],
        selectedInstance: getSelectedInstance("Image"),
        updateProps: jest.fn(),
        deleteProp: jest.fn(),
      })
    );

    const imgMeta = getComponentMeta("Image");

    const propNames = result.current.userProps.map((userProp) => userProp.name);

    expect(imgMeta?.initialProps).toEqual(
      propNames.slice(0, imgMeta?.initialProps?.length ?? 0)
    );

    expect(propNames.slice(imgMeta?.initialProps?.length ?? 0)).toEqual(
      result.current.userProps
        .filter(
          (userProp) => imgMeta?.initialProps?.includes(userProp.name) === false
        )
        .map((userProp) => userProp.name)
    );
  });

  test("should return isRequired true for initial props", () => {
    const { result } = renderHook(() =>
      usePropsLogic({
        props: [],
        selectedInstance: getSelectedInstance("Image"),
        updateProps: jest.fn(),
        deleteProp: jest.fn(),
      })
    );

    expect(
      result.current.isRequired({
        id: "2",
        instanceId: "instanceId",
        name: "src",
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
        selectedInstance: getSelectedInstance("Image"),
        updateProps: jest.fn(),
        deleteProp: jest.fn(),
      })
    );

    expect(
      result.current.isRequired({
        id: "2",
        instanceId: "instanceId",
        name: "arial-label",
        type: "string",
        value: "https://example.com",
        required: true,
      })
    ).toBe(true);

    expect(
      result.current.isRequired({
        id: "2",
        instanceId: "instanceId",
        name: "arial-label",
        type: "string",
        value: "https://example.com",
        required: false,
      })
    ).toBe(false);
  });
});
