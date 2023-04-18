```json
{
  "instances": [
    {
      "type": "instance",
      "id": "id-Box-0",
      "component": "Box",
      "label": "Container",
      "children": [
        {
          "type": "id",
          "value": "id-Box-1"
        },
        {
          "type": "id",
          "value": "id-Box-2"
        },
        {
          "type": "id",
          "value": "id-Box-3"
        }
      ]
    },
    {
      "type": "instance",
      "id": "id-Box-1",
      "component": "Box",
      "label": "Left Column",
      "children": [
        {
          "type": "id",
          "value": "id-Text-1"
        }
      ]
    },
    {
      "type": "instance",
      "id": "id-Box-2",
      "component": "Box",
      "label": "Middle Column",
      "children": [
        {
          "type": "id",
          "value": "id-Text-2"
        }
      ]
    },
    {
      "type": "instance",
      "id": "id-Box-3",
      "component": "Box",
      "label": "Right Column",
      "children": [
        {
          "type": "id",
          "value": "id-Text-3"
        }
      ]
    },
    {
      "type": "instance",
      "id": "id-Text-1",
      "component": "Text",
      "label": "Left",
      "children": [
        {
          "type": "text",
          "value": "Left"
        }
      ]
    },
    {
      "type": "instance",
      "id": "id-Text-2",
      "component": "Text",
      "label": "Middle",
      "children": [
        {
          "type": "text",
          "value": "Middle"
        }
      ]
    },
    {
      "type": "instance",
      "id": "id-Text-3",
      "component": "Text",
      "label": "Right",
      "children": [
        {
          "type": "text",
          "value": "Right"
        }
      ]
    }
  ],
  "props": [],
  "styles": [
    {
      "type": "styles",
      "id": "styles-1",
      "values": {
        "display": "flex",
        "flexDirection": ["column", "column", "row"]
      }
    },
    {
      "type": "styles",
      "id": "styles-2",
      "values": { "flex": [1, 1, 1 / 3] }
    }
  ]
}
```
