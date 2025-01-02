import { scrollIntoView } from "./dom-utils";

export default {
  title: "DomUtile/ScrollIntoView",
};

const handleClick = (selector: string) => {
  const elements = document.querySelectorAll(selector);

  const element = elements[0];
  if (element === undefined) {
    return;
  }

  if (false === element instanceof HTMLElement) {
    return;
  }

  scrollIntoView(element, element.getBoundingClientRect());
};

const ToolbarStory = () => {
  return (
    <div>
      <button onClick={() => handleClick(".element")}>
        Test Scroll Into Scrollable
      </button>
      <button onClick={() => handleClick(".viewport")}>
        Test Scroll Into Viewport
      </button>
      <h1
        style={{
          marginTop: "1000px",
        }}
      >
        Viewport Matrix Fiztures
      </h1>
      <div
        style={{
          marginTop: "20px",
          width: "200px",
          height: "200px",
          overflow: "auto",
        }}
      >
        <h1 style={{ marginTop: "2400px" }} className="element">
          Inside scrollable
        </h1>
        <div style={{ height: "1000px" }}></div>
      </div>
      <h2 className="viewport">Inside viewport</h2>
      <div style={{ height: "1000px" }}></div>
      <button onClick={() => handleClick(".element")}>
        Test Scroll Into Scrollable
      </button>
      <button onClick={() => handleClick(".viewport")}>
        Test Scroll Into Viewport
      </button>
    </div>
  );
};

export { ToolbarStory as Toolbar };
