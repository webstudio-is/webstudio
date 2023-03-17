import { StorySection } from "../storybook";
import {
  handleArrowFocus,
  setArrowFocusRow,
  setArrowFocusColumn,
} from "./arrow-focus";

const main = {
  width: 160,
  height: 30,
  display: "inline-block",
  textAlign: "left",
} as const;

const secondary = {
  display: "inline-flex",
  gap: 4,
  marginLeft: -70,
} as const;

export const Demo = () => {
  return (
    <>
      <StorySection title="Button with nested buttons">
        <div onKeyDown={handleArrowFocus}>
          <button style={main}>Main</button>
          <div style={secondary}>
            <button tabIndex={-1}>A</button>
            <button tabIndex={-1}>B</button>
          </div>
        </div>
      </StorySection>

      <StorySection title="Input with nested buttons">
        <div onKeyDown={handleArrowFocus}>
          <input placeholder="Main" style={main} />
          <div style={secondary}>
            <button tabIndex={-1}>A</button>
            <button tabIndex={-1}>B</button>
          </div>
        </div>
      </StorySection>

      <StorySection title="List">
        <ul onKeyDown={handleArrowFocus}>
          <li>
            <button>First</button>
          </li>
          <li>
            <button tabIndex={-1}>Second</button>
          </li>
          <li>
            <button tabIndex={-1}>Third</button>
          </li>
          <li>
            <button tabIndex={-1}>Fourth</button>
          </li>
        </ul>
      </StorySection>

      <StorySection title="List with nested controls">
        <ul onKeyDown={handleArrowFocus}>
          {["First", "Second", "Third", "Fourth"].map((row) => (
            <li key={row}>
              <button
                {...setArrowFocusRow(row)}
                style={main}
                tabIndex={row === "First" ? 0 : -1}
              >
                {row}
              </button>
              <div style={secondary}>
                <button {...setArrowFocusRow(row)} tabIndex={-1}>
                  A
                </button>
                <button {...setArrowFocusRow(row)} tabIndex={-1}>
                  B
                </button>
              </div>
            </li>
          ))}
        </ul>
      </StorySection>

      <StorySection title="Grid">
        <ul onKeyDown={handleArrowFocus}>
          {["A", "B", "C"].map((row) => (
            <li key={row}>
              {["1", "2", "3"].map((column) => (
                <button
                  {...setArrowFocusRow(row)}
                  {...setArrowFocusColumn(column)}
                  key={column}
                  tabIndex={row === "B" && column === "2" ? 0 : -1}
                >
                  {row}
                  {column}
                </button>
              ))}
            </li>
          ))}
        </ul>
      </StorySection>
    </>
  );
};

export default { component: Demo };
