import { ComponentStory, ComponentMeta } from "@storybook/react";
import { Canvas, Item } from "./main";

export default {
  component: Canvas,
} as ComponentMeta<typeof Canvas>;

const tree = {
  id: "root",
  type: "div",
  style: {},
  content: [
    {
      id: "1",
      type: "ul",
      style: {},
      content: [
        { id: "1.1", type: "li", content: "Foo" },
        { id: "1.2", type: "li", content: "Bar" },
        {
          id: "1.3",
          type: "li",
          content: [
            {
              id: "1.3.1",
              type: "div",
              style: { background: "red" },
              content: "Baz",
            },
          ],
        },
      ],
    },
    {
      id: "2",
      type: "div",
      style: { display: "flex" },
      content: [
        {
          id: "2.1",
          type: "div",
          style: { width: "100px", height: "100px", background: "red" },
          content: [],
        },
        {
          id: "2.2",
          type: "div",
          style: { width: "100px", height: "100px", background: "green" },
          content: [],
        },
        {
          id: "2.3",
          type: "div",
          style: { width: "100px", height: "100px", background: "blue" },
          content: [],
        },
      ],
    },
    {
      id: "3",
      type: "div",
      style: {},
      content: [
        {
          id: "3.1",
          type: "div",
          style: { height: "100px", background: "red" },
          content: [],
        },
        {
          id: "3.2",
          type: "div",
          style: { display: "flex", padding: "20px", background: "green" },
          content: [
            {
              id: "3.2.1",
              type: "div",
              style: { width: "100px", height: "100px", background: "red" },
              content: [],
            },
            {
              id: "3.2.2",
              type: "div",
              style: { width: "100px", height: "100px", background: "yellow" },
              content: [],
            },
            {
              id: "3.2.3",
              type: "div",
              style: { width: "100px", height: "100px", background: "blue" },
              content: [],
            },
          ],
        },
        {
          id: "3.3",
          type: "div",
          style: { height: "100px", background: "blue" },
          content: [],
        },
      ],
    },
  ],
} as Item;

export const Main: ComponentStory<typeof Canvas> = () => {
  return <Canvas data={tree} />;
};
