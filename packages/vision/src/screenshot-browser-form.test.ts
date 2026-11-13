import { afterEach, expect, test, vi } from "vitest";
import {
  isRenderedFormReady,
  submitRenderedForm,
} from "./screenshot-browser-cdp";

class Control {
  name: string;
  private currentValue = "";
  get value() {
    return this.currentValue;
  }
  set value(value: string) {
    this.currentValue = value;
  }
  type = "text";
  checked = false;
  files: unknown;
  validity = {
    valid: true,
    valueMissing: false,
    typeMismatch: false,
    patternMismatch: false,
    tooLong: false,
    tooShort: false,
    rangeUnderflow: false,
    rangeOverflow: false,
    stepMismatch: false,
    badInput: false,
    customError: false,
  };
  validationMessage = "";
  dispatchEvent = vi.fn();
  constructor(name: string, type = "text") {
    this.name = name;
    this.type = type;
  }
}

class Input extends Control {
  get value() {
    return super.value;
  }
  set value(value: string) {
    super.value = value;
  }
  click = vi.fn(() => {
    this.checked = !this.checked;
    this.dispatchEvent(new Event("click", { bubbles: true }));
  });
}

class Button {
  formNoValidate = false;
}

class TextArea extends Control {
  get value() {
    return super.value;
  }
  set value(value: string) {
    super.value = value;
  }
}

class Select extends Control {
  multiple = false;
  options: { value: string; selected: boolean }[] = [];
}

class Form {
  elements: Control[];
  noValidate = false;
  valid = true;
  disabled = false;
  submitter: unknown;
  requestSubmit = vi.fn((submitter?: unknown) => {
    this.submitter = submitter;
  });
  checkValidity = vi.fn(() => this.valid);
  getAttribute = vi.fn(() => null);
  querySelector = vi.fn((selector: string) =>
    selector === ":scope > fieldset[disabled]"
      ? this.disabled
        ? {}
        : null
      : new Button()
  );
  constructor(elements: Control[]) {
    this.elements = elements;
  }
}

const installDom = (form: Form) => {
  vi.stubGlobal("window", { location: { origin: "http://127.0.0.1:5173" } });
  vi.stubGlobal("HTMLFormElement", Form);
  vi.stubGlobal("HTMLInputElement", Input);
  vi.stubGlobal("HTMLTextAreaElement", TextArea);
  vi.stubGlobal("HTMLSelectElement", Select);
  vi.stubGlobal("HTMLButtonElement", Button);
  vi.stubGlobal("HTMLElement", Button);
  vi.stubGlobal("document", {
    querySelector: (selector: string) =>
      selector === "[data-ws-project]" ? {} : form,
  });
};

afterEach(() => vi.unstubAllGlobals());

test("refuses redirected origins before filling a generated Form", () => {
  const field = new Input("email");
  const form = new Form([field]);
  installDom(form);
  vi.stubGlobal("window", { location: { origin: "https://other.example" } });

  expect(
    submitRenderedForm({
      url: "http://127.0.0.1:5173/contact",
      selector: "form",
      values: [{ name: "email", value: "private@example.com" }],
      timeout: 1000,
    })
  ).toEqual({ status: "off_origin" });
  expect(field.value).toBe("");
  expect(form.requestSubmit).not.toHaveBeenCalled();
});

test("waits for React and the generated Resource Form fieldset to hydrate", () => {
  const form = new Form([new Input("email")]);
  form.disabled = true;
  installDom(form);
  expect(isRenderedFormReady("form")).toBe(false);
  form.disabled = false;
  expect(isRenderedFormReady("form")).toBe(false);
  Object.defineProperty(form, "__reactProps$test", { value: {} });
  expect(isRenderedFormReady("form")).toBe(true);
});

test("native validation stops before the submit event can dispatch", () => {
  const email = new Input("email");
  email.validity.valid = false;
  email.validity.typeMismatch = true;
  email.validationMessage = 'Entered "secret@example.com" is invalid';
  const form = new Form([email]);
  form.valid = false;
  installDom(form);

  const result = submitRenderedForm({
    url: "http://127.0.0.1:5173/contact",
    selector: "form",
    values: [{ name: "email", value: "secret@example.com" }],
    timeout: 1000,
  });
  expect(result).toEqual({
    status: "validation_failed",
    errors: [{ name: "email", message: "Enter a valid value for this field." }],
  });
  expect(JSON.stringify(result)).not.toContain("secret@example.com");
  expect(form.requestSubmit).not.toHaveBeenCalled();
});

test("reports invalid textarea and select controls without dispatching", () => {
  const message = new TextArea("message");
  message.validity.valid = false;
  message.validity.valueMissing = true;
  message.validationMessage = "Custom error containing private message";
  const category = new Select("category");
  category.validity.valid = false;
  category.validity.customError = true;
  category.validationMessage = "Custom error containing private selection";
  const form = new Form([message, category]);
  form.valid = false;
  installDom(form);

  const result = submitRenderedForm({
    url: "http://127.0.0.1:5173/contact",
    selector: "form",
    values: [],
    timeout: 1000,
  });
  expect(result).toEqual({
    status: "validation_failed",
    errors: [
      { name: "message", message: "A value is required." },
      { name: "category", message: "This field is invalid." },
    ],
  });
  expect(JSON.stringify(result)).not.toContain("private");
  expect(form.requestSubmit).not.toHaveBeenCalled();
});

test("fills repeated fields and passes the selected submit button to requestSubmit", () => {
  const first = new Input("tag");
  const second = new Input("tag");
  const form = new Form([first, second]);
  installDom(form);

  expect(
    submitRenderedForm({
      url: "http://127.0.0.1:5173/contact",
      selector: "form",
      values: [
        { name: "tag", value: "one" },
        { name: "tag", value: "two" },
      ],
      submitter: "button[type=submit]",
      timeout: 1000,
    }).status
  ).toBe("dispatched");
  expect([first.value, second.value]).toEqual(["one", "two"]);
  expect(form.querySelector).toHaveBeenCalledWith("button[type=submit]");
  expect(form.requestSubmit).toHaveBeenCalledOnce();
  expect(form.submitter).toBeInstanceOf(Button);
});

test("bypasses React's value tracker so input changes reach authored handlers", () => {
  const field = new Input("subject");
  const changes: string[] = [];
  const nativeValue = Object.getOwnPropertyDescriptor(
    Input.prototype,
    "value"
  )!;
  let trackedValue = field.value;
  Object.defineProperty(field, "value", {
    get: () => nativeValue.get!.call(field),
    set: (value: string) => {
      nativeValue.set!.call(field, value);
      trackedValue = value;
    },
  });
  field.dispatchEvent = vi.fn((event: Event) => {
    if (event.type === "input" && field.value !== trackedValue) {
      changes.push(field.value);
      trackedValue = field.value;
    }
    return true;
  });
  const form = new Form([field]);
  installDom(form);
  submitRenderedForm({
    url: "http://127.0.0.1:5173/contact",
    selector: "form",
    values: [{ name: "subject", value: "Changed" }],
    timeout: 1000,
  });
  expect(changes).toEqual(["Changed"]);
  expect(form.requestSubmit).toHaveBeenCalledOnce();
});

test("clicks checkbox and radio controls to run React change handlers", () => {
  const first = new Input("tag", "checkbox");
  first.value = "one";
  const second = new Input("tag", "checkbox");
  second.value = "two";
  const choice = new Input("choice", "radio");
  choice.value = "yes";
  const form = new Form([first, second, choice]);
  installDom(form);
  submitRenderedForm({
    url: "http://127.0.0.1:5173/contact",
    selector: "form",
    values: [
      { name: "tag", value: "two" },
      { name: "choice", value: "yes" },
    ],
    timeout: 1000,
  });
  expect(first.click).not.toHaveBeenCalled();
  expect(second.click).toHaveBeenCalledOnce();
  expect(choice.click).toHaveBeenCalledOnce();
  expect([first.checked, second.checked, choice.checked]).toEqual([
    false,
    true,
    true,
  ]);
});

test("decodes bounded base64 into actual File bytes on the form control", () => {
  const upload = new Input("attachment", "file");
  const form = new Form([upload]);
  installDom(form);
  class TestFile {
    bytes: Uint8Array;
    name: string;
    options: { type?: string };
    constructor(parts: Uint8Array[], name: string, options: { type?: string }) {
      this.bytes = parts[0];
      this.name = name;
      this.options = options;
    }
  }
  class TestTransfer {
    files: TestFile[] = [];
    items = { add: (file: TestFile) => this.files.push(file) };
  }
  vi.stubGlobal("File", TestFile);
  vi.stubGlobal("DataTransfer", TestTransfer);

  submitRenderedForm({
    url: "http://127.0.0.1:5173/contact",
    selector: "form",
    values: [
      {
        name: "attachment",
        file: {
          name: "hello.txt",
          type: "text/plain",
          base64: "aGVsbG8=",
        },
      },
    ],
    timeout: 1000,
  });
  expect((upload.files as TestFile[])[0]).toMatchObject({
    name: "hello.txt",
    options: { type: "text/plain" },
    bytes: new Uint8Array([104, 101, 108, 108, 111]),
  });
  expect(form.requestSubmit).toHaveBeenCalledOnce();
});
