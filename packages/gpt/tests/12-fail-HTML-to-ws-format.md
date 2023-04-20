Given the following HTML:

```html
<body>
  <div style="text-align: center;">
    <img src="logo.png" alt="Logo" />
  </div>
  <h1 style="text-align: center; font-size: 3em; font-weight: bold;">
    Page Title
  </h1>
  <nav style="display: flex; justify-content: center; margin-bottom: 1em;">
    <a
      href="#"
      style="border: 2px solid black; padding: 0.5em 1em; margin-right: 1em;"
      >Home</a
    >
    <a
      href="#"
      style="border: 2px solid black; padding: 0.5em 1em; margin-right: 1em;"
      >About</a
    >
    <a href="#" style="border: 2px solid black; padding: 0.5em 1em;">Contact</a>
  </nav>
  <div style="display: flex; flex-wrap: wrap;">
    <div
      style="flex: 1 0 30%; margin: 1%; background-color: #f0f0f0; border-radius: 0.5em; padding: 1em;"
    >
      <img
        src="image1.jpg"
        alt="Image 1"
        style="width: 100%; border-radius: 0.5em;"
      />
      <p style="margin-top: 1em; font-weight: bold;">Category 1</p>
      <h2 style="margin-top: 0.5em;">Post Title 1</h2>
      <p style="margin-top: 0.5em;">Excerpt 1</p>
      <img
        src="avatar1.jpg"
        alt="Avatar 1"
        style="width: 2em; height: 2em; border-radius: 50%; margin-top: 0.5em;"
      />
    </div>
    <div
      style="flex: 1 0 30%; margin: 1%; background-color: #f0f0f0; border-radius: 0.5em; padding: 1em;"
    >
      <img
        src="image1.jpg"
        alt="Image 1"
        style="width: 100%; border-radius: 0.5em;"
      />
      <p style="margin-top: 1em; font-weight: bold;">Category 1</p>
      <h2 style="margin-top: 0.5em;">Post Title 1</h2>
      <p style="margin-top: 0.5em;">Excerpt 1</p>
      <img
        src="avatar1.jpg"
        alt="Avatar 1"
        style="width: 2em; height: 2em; border-radius: 50%; margin-top: 0.5em;"
      />
    </div>
    <div
      style="flex: 1 0 30%; margin: 1%; background-color: #f0f0f0; border-radius: 0.5em; padding: 1em;"
    >
      <img
        src="image1.jpg"
        alt="Image 1"
        style="width: 100%; border-radius: 0.5em;"
      />
      <p style="margin-top: 1em; font-weight: bold;">Category 1</p>
      <h2 style="margin-top: 0.5em;">Post Title 1</h2>
      <p style="margin-top: 0.5em;">Excerpt 1</p>
      <img
        src="avatar1.jpg"
        alt="Avatar 1"
        style="width: 2em; height: 2em; border-radius: 50%; margin-top: 0.5em;"
      />
    </div>
    <div
      style="flex: 1 0 30%; margin: 1%; background-color: #f0f0f0; border-radius: 0.5em; padding: 1em;"
    >
      <img
        src="image1.jpg"
        alt="Image 1"
        style="width: 100%; border-radius: 0.5em;"
      />
      <p style="margin-top: 1em; font-weight: bold;">Category 1</p>
      <h2 style="margin-top: 0.5em;">Post Title 1</h2>
      <p style="margin-top: 0.5em;">Excerpt 1</p>
      <img
        src="avatar1.jpg"
        alt="Avatar 1"
        style="width: 2em; height: 2em; border-radius: 50%; margin-top: 0.5em;"
      />
    </div>
  </div>
</body>
```

Can you convert it to a valid JSON object that follows the rules below?

The only available components (instances) are: Body, Box, TextBlock, Heading.

- Body is a page container
- Box is a container element
- TextBlock is a wrapper for text instances
- Heading is a typography component used for headings and titles
- Image is an component for images

Strict rules:

- Instance `id` is unique and has the following format: `id-{ComponentName}-{number}`.
- Don't use any dependency or external library.
- Your answer can be parsed as JSON, therefore you will exclusively generate a code block with valid JSON.
- Don't generate nor include any explanation.
- The produced JSON strictly follows the TypeScript definitions (spec) below:

```typescript
export type JSON = {
  // breakpoints: Breakpoint[];
  instances: Instance[];
  styleSourceSelections: StyleSourceSelection[];
  styleSources: StyleSource[];
  styles: StyleDecl[];
  // props: Prop[];
  // pages: Pages[];
};

type Breakpoint = {
  id: string;
  label: string;
  minWidth?: number | undefined;
  maxWidth?: number | undefined;
};

type InstanceId = string;

type Instance = {
  type: "instance";
  id: InstanceId;
  component: string;
  label?: string | undefined;
  children: (
    | {
        type: "id";
        value: string;
      }
    | {
        type: "text";
        value: string;
      }
  )[];
};

type Pages = {
  homePage: {
    id: string;
    name: string;
    title: string;
    meta: {
      [x: string]: string;
    };
    rootInstanceId: string;
    path: string;
  };
  pages: {
    id: string;
    name: string;
    title: string;
    meta: {
      [x: string]: string;
    };
    rootInstanceId: string;
    path: string;
  }[];
};

type Prop =
  | {
      id: string;
      instanceId: InstanceId;
      name: string;
      required?: boolean | undefined;
      type: "number";
      value: number;
    }
  | {
      id: string;
      instanceId: InstanceId;
      name: string;
      required?: boolean | undefined;
      type: "string";
      value: string;
    }
  | {
      id: string;
      instanceId: InstanceId;
      name: string;
      required?: boolean | undefined;
      type: "boolean";
      value: boolean;
    }
  | {
      id: string;
      instanceId: InstanceId;
      name: string;
      required?: boolean | undefined;
      type: "asset";
      value: string;
    }
  | {
      id: string;
      instanceId: InstanceId;
      name: string;
      required?: boolean | undefined;
      type: "page";
      value: string;
    }
  | {
      id: string;
      instanceId: InstanceId;
      name: string;
      required?: boolean | undefined;
      type: "string[]";
      value: string[];
    };

type StyleSourceId = string;

type StyleSourceSelection = {
  instanceId: InstanceId;
  values: StyleSourceId[];
};

type StyleSource =
  | {
      type: "token";
      id: StyleSourceId;
      name: string;
    }
  | {
      type: "local";
      id: StyleSourceId;
    };

type StyleDecl = {
  styleSourceId: StyleSourceId;
  breakpointId: string;
  state?: string | undefined;
  property: string;
  value:
    | {
        type: "keyword";
        value: string;
      }
    | {
        type: "fontFamily";
        value: string[];
      }
    | {
        type: "rgb";
        r: number;
        g: number;
        b: number;
        alpha: number;
      }
    | {
        type: "invalid";
        value: string;
      }
    | {
        type: "unset";
        value: "";
      }
    | Units;
};

type Units = {
  type: "unit";
  unit:
    | (
        | "%"
        | "deg"
        | "grad"
        | "rad"
        | "turn"
        | "db"
        | "fr"
        | "hz"
        | "khz"
        | "cm"
        | "mm"
        | "q"
        | "in"
        | "pt"
        | "pc"
        | "px"
        | "em"
        | "rem"
        | "ex"
        | "rex"
        | "cap"
        | "rcap"
        | "ch"
        | "rch"
        | "ic"
        | "ric"
        | "lh"
        | "rlh"
        | "vw"
        | "svw"
        | "lvw"
        | "dvw"
        | "vh"
        | "svh"
        | "lvh"
        | "dvh"
        | "vi"
        | "svi"
        | "lvi"
        | "dvi"
        | "vb"
        | "svb"
        | "lvb"
        | "dvb"
        | "vmin"
        | "svmin"
        | "lvmin"
        | "dvmin"
        | "vmax"
        | "svmax"
        | "lvmax"
        | "dvmax"
        | "cqw"
        | "cqh"
        | "cqi"typography
        | "cqb"
        | "cqmin"
        | "cqmax"
        | "dpi"
        | "dpcm"
        | "dppx"
        | "x"
        | "st"
        | "s"
        | "ms"
      )
    | "number";
  value: number;
};
```
