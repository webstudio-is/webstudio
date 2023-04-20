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
      "label": "contact form",
      "children": [
        {
          "type": "instance",
          "id": "instance-Heading-1",
          "component": "Heading",
          "label": "Contact Form Heading",
          "children": [
            {
              "type": "text",
              "value": "Contact Form"
            }
          ]
        },
        {
          "type": "instance",
          "id": "instance-Input-1",
          "component": "Input",
          "label": "Name",
          "children": []
        },
        {
          "type": "instance",
          "id": "instance-Input-2",
          "component": "Input",
          "label": "Subject",
          "children": []
        },
        {
          "type": "instance",
          "id": "instance-Input-3",
          "component": "Input",
          "label": "Email Address",
          "children": []
        },
        {
          "type": "instance",
          "id": "instance-TextArea-1",
          "component": "TextArea",
          "label": "Message",
          "children": []
        },
        {
          "type": "instance",
          "id": "instance-Button-1",
          "component": "Button",
          "label": "Submit",
          "children": []
        }
      ]
    }
  ]
}
```

---

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
      "label": "tablet",
      "minWidth": 768,
      "maxWidth": 1023
    },
    {
      "id": "breakpointId-3",
      "label": "desktop",
      "minWidth": 1024
    }
  ],
  "styleDecls": [
    {
      "styleSourceId": "styleSourceId-1",
      "breakpointId": "breakpointId-1",
      "property": "backgroundColor",
      "value": {
        "type": "rgb",
        "r": 255,
        "g": 255,
        "b": 255,
        "alpha": 1
      }
    },
    {
      "styleSourceId": "styleSourceId-2",
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
      "breakpointId": "breakpointId-1",
      "property": "fontSize",
      "value": {
        "type": "unit",
        "unit": "em",
        "value": 2
      }
    },
    {
      "styleSourceId": "styleSourceId-4",
      "breakpointId": "breakpointId-2",
      "property": "backgroundColor",
      "value": {
        "type": "rgb",
        "r": 255,
        "g": 255,
        "b": 255,
        "alpha": 1
      }
    },
    {
      "styleSourceId": "styleSourceId-5",
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
      "styleSourceId": "styleSourceId-6",
      "breakpointId": "breakpointId-2",
      "property": "fontSize",
      "value": {
        "type": "unit",
        "unit": "em",
        "value": 2.5
      }
    },
    {
      "styleSourceId": "styleSourceId-7",
      "breakpointId": "breakpointId-3",
      "property": "backgroundColor",
      "value": {
        "type": "rgb",
        "r": 255,
        "g": 255,
        "b": 255,
        "alpha": 1
      }
    },
    {
      "styleSourceId": "styleSourceId-8",
      "breakpointId": "breakpointId-3",
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
      "styleSourceId": "styleSourceId-9",
      "breakpointId": "breakpointId-3",
      "property": "fontSize",
      "value": {
        "type": "unit",
        "unit": "em",
        "value": 3
      }
    }
  ],
  "styleSourceSelections": [
    {
      "instanceId": "instance-Heading-1",
      "values": [
        "styleSourceId-2",
        "styleSourceId-3",
        "styleSourceId-4",
        "styleSourceId-5",
        "styleSourceId-6",
        "styleSourceId-7",
        "styleSourceId-8",
        "styleSourceId-9"
      ]
    },
    {
      "instanceId": "instance-Paragraph-1",
      "values": [
        "styleSourceId-2",
        "styleSourceId-3",
        "styleSourceId-4",
        "styleSourceId-5",
        "styleSourceId-6",
        "styleSourceId-7",
        "styleSourceId-8",
        "styleSourceId-9"
      ]
    }
  ],
  "styleSources": [
    {
      "type": "token",
      "id": "styleSourceId-1",
      "name": "white"
    },
    {
      "type": "token",
      "id": "styleSourceId-2",
      "name": "black"
    },
    {
      "type": "local",
      "id": "styleSourceId-3"
    },
    {
      "type": "local",
      "id": "styleSourceId-4"
    },
    {
      "type": "local",
      "id": "styleSourceId-5"
    },
    {
      "type": "local",
      "id": "styleSourceId-6"
    },
    {
      "type": "local",
      "id": "styleSourceId-7"
    },
    {
      "type": "local",
      "id": "styleSourceId-8"
    },
    {
      "type": "local",
      "id": "styleSourceId-9"
    }
  ]
}
```
