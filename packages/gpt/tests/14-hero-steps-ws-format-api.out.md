```json
{
  "instances": [
    {
      "type": "instance",
      "id": "instance-Body-1",
      "component": "Body",
      "children": [
        {
          "type": "id",
          "value": "instance-Box-1"
        }
      ]
    },
    {
      "type": "instance",
      "id": "instance-Box-1",
      "component": "Box",
      "children": [
        {
          "type": "id",
          "value": "instance-Heading-1"
        },
        {
          "type": "id",
          "value": "instance-TextBlock-1"
        }
      ]
    },
    {
      "type": "instance",
      "id": "instance-Heading-1",
      "component": "Heading",
      "label": "Webstudio",
      "children": [
        {
          "type": "text",
          "value": "Webstudio"
        }
      ]
    },
    {
      "type": "instance",
      "id": "instance-TextBlock-1",
      "component": "TextBlock",
      "label": "Lorem ipsum",
      "children": [
        {
          "type": "text",
          "value": "Lorem ipsum dolor sit amet"
        }
      ]
    }
  ]
}
```

---

Sure, here's an example of how you can style the hero section with a title and a paragraph:

```json
{
  "breakpoints": [
    {
      "id": "breakpointId-1",
      "label": "Mobile",
      "maxWidth": 767
    },
    {
      "id": "breakpointId-2",
      "label": "Tablet",
      "minWidth": 768,
      "maxWidth": 1023
    },
    {
      "id": "breakpointId-3",
      "label": "Desktop",
      "minWidth": 1024
    }
  ],
  "styleDecls": [
    {
      "styleSourceId": "styleSourceId-1",
      "breakpointId": "breakpointId-1",
      "property": "font-size",
      "value": {
        "type": "unit",
        "unit": "px",
        "value": 24
      }
    },
    {
      "styleSourceId": "styleSourceId-1",
      "breakpointId": "breakpointId-2",
      "property": "font-size",
      "value": {
        "type": "unit",
        "unit": "px",
        "value": 32
      }
    },
    {
      "styleSourceId": "styleSourceId-1",
      "breakpointId": "breakpointId-3",
      "property": "font-size",
      "value": {
        "type": "unit",
        "unit": "px",
        "value": 48
      }
    },
    {
      "styleSourceId": "styleSourceId-2",
      "breakpointId": "breakpointId-1",
      "property": "font-size",
      "value": {
        "type": "unit",
        "unit": "px",
        "value": 16
      }
    },
    {
      "styleSourceId": "styleSourceId-2",
      "breakpointId": "breakpointId-2",
      "property": "font-size",
      "value": {
        "type": "unit",
        "unit": "px",
        "value": 20
      }
    },
    {
      "styleSourceId": "styleSourceId-2",
      "breakpointId": "breakpointId-3",
      "property": "font-size",
      "value": {
        "type": "unit",
        "unit": "px",
        "value": 24
      }
    },
    {
      "styleSourceId": "styleSourceId-3",
      "breakpointId": "breakpointId-1",
      "property": "color",
      "value": {
        "type": "rgb",
        "r": 0,
        "g": 0,
        "b": 0,
        "alpha": 1
      }
    },
    {
      "styleSourceId": "styleSourceId-3",
      "breakpointId": "breakpointId-2",
      "property": "color",
      "value": {
        "type": "rgb",
        "r": 0,
        "g": 0,
        "b": 0,
        "alpha": 1
      }
    },
    {
      "styleSourceId": "styleSourceId-3",
      "breakpointId": "breakpointId-3",
      "property": "color",
      "value": {
        "type": "rgb",
        "r": 0,
        "g": 0,
        "b": 0,
        "alpha": 1
      }
    }
  ],
  "styleSourceSelections": [
    {
      "instanceId": "instance-Heading-1",
      "values": ["styleSourceId-1", "styleSourceId-3"]
    },
    {
      "instanceId": "instance-TextBlock-1",
      "values": ["styleSourceId-2", "styleSourceId-3"]
    }
  ],
  "styleSources": [
    {
      "type": "token",
      "id": "styleSourceId-1",
      "name": "font-size"
    },
    {
      "type": "token",
      "id": "styleSourceId-2",
      "name": "font-size"
    },
    {
      "type": "local",
      "id": "styleSourceId-3"
    }
  ]
}
```

In this example, we define three breakpoints for mobile, tablet, and desktop. We also define three style sources: two for font sizes and one for text color. We then link the style sources to the instances using `styleSourceSelections`, and define the actual style declarations in `styleDecls`.

Note that we only define the font size for the `Heading` and `TextBlock` instances, and the text color for the `Heading` and `TextBlock` instances. This means that any other instances in the design will not be affected by these styles.
