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
      "label": "hero section",
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
      "label": "hero title",
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
      "label": "hero text",
      "children": [
        {
          "type": "text",
          "value": "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
        }
      ]
    }
  ]
}
```

---

Sure, here's the JSON styles for the hero section:

```json
{
  "breakpoints": [
    {
      "id": "breakpointId-1",
      "label": "mobile",
      "maxWidth": 767
    },
    {
      "id": "breakpointId-2",
      "label": "desktop",
      "minWidth": 768
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
      "name": "font-family"
    },
    {
      "type": "token",
      "id": "styleSourceId-3",
      "name": "color"
    },
    {
      "type": "local",
      "id": "styleSourceId-4"
    },
    {
      "type": "local",
      "id": "styleSourceId-5"
    }
  ],
  "styleDecls": [
    {
      "styleSourceId": "styleSourceId-1",
      "breakpointId": "breakpointId-1",
      "property": "font-size",
      "value": {
        "type": "unit",
        "unit": "em",
        "value": 2
      }
    },
    {
      "styleSourceId": "styleSourceId-1",
      "breakpointId": "breakpointId-2",
      "property": "font-size",
      "value": {
        "type": "unit",
        "unit": "em",
        "value": 3
      }
    },
    {
      "styleSourceId": "styleSourceId-2",
      "breakpointId": "breakpointId-1",
      "property": "font-family",
      "value": {
        "type": "fontFamily",
        "value": ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"]
      }
    },
    {
      "styleSourceId": "styleSourceId-2",
      "breakpointId": "breakpointId-2",
      "property": "font-family",
      "value": {
        "type": "fontFamily",
        "value": ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"]
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
      "styleSourceId": "styleSourceId-4",
      "breakpointId": "breakpointId-1",
      "property": "margin",
      "value": {
        "type": "unit",
        "unit": "px",
        "value": 16
      }
    },
    {
      "styleSourceId": "styleSourceId-4",
      "breakpointId": "breakpointId-2",
      "property": "margin",
      "value": {
        "type": "unit",
        "unit": "px",
        "value": 32
      }
    },
    {
      "styleSourceId": "styleSourceId-5",
      "breakpointId": "breakpointId-1",
      "property": "text-align",
      "value": {
        "type": "keyword",
        "value": "center"
      }
    },
    {
      "styleSourceId": "styleSourceId-5",
      "breakpointId": "breakpointId-2",
      "property": "text-align",
      "value": {
        "type": "keyword",
        "value": "center"
      }
    }
  ],
  "styleSourceSelections": [
    {
      "instanceId": "id-Heading-1",
      "values": ["styleSourceId-1", "styleSourceId-2", "styleSourceId-3"]
    },
    {
      "instanceId": "id-TextBlock-1",
      "values": ["styleSourceId-1", "styleSourceId-2", "styleSourceId-3"]
    },
    {
      "instanceId": "id-Box-1",
      "values": ["styleSourceId-4", "styleSourceId-5"]
    }
  ]
}
```

Note that I've added some default styles for font size, font family, and color, as well as some margin and text alignment styles for the box containing the heading and text block. You can adjust these values as needed.
