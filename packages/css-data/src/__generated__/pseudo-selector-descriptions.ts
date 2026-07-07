// This file was auto-generated
// Descriptions for CSS pseudo-classes
export const pseudoClassDescriptions: Record<string, string> = {
  ":active":
    "Matches when the element is being activated, like when a button is being pressed.",
  ":any-link": "Matches links that are either visited or unvisited.",
  ":autofill":
    "Matches form elements that have been auto-filled by the browser.",
  ":checked":
    "Matches checkboxes, radio buttons, or options that are currently selected or toggled on.",
  ":default":
    "Matches the default form element in a group, like a submit button.",
  ":defined":
    "Matches any element that has been defined, including custom elements.",
  ":disabled":
    "Matches form elements that are currently disabled and cannot be interacted with.",
  ":empty": "Matches elements that have no children, including text nodes.",
  ":enabled":
    "Matches form elements that are currently enabled and can be interacted with.",
  ":first-child": "Matches an element that is the first child of its parent.",
  ":first-of-type": "Matches the first element of its type among siblings.",
  ":focus":
    "Matches when the element has received focus, like when clicked or tabbed to.",
  ":focus-visible":
    "Matches when the element has focus and the browser determines focus should be visible.",
  ":focus-within":
    "Matches when the element or any of its descendants has focus.",
  ":fullscreen":
    "Matches when the element is currently displayed in fullscreen mode.",
  ":has()":
    "Matches elements that contain elements matching the specified selector.",
  ":hover":
    "Matches when the user's pointer is over the element, like when moving a mouse cursor over it.",
  ":in-range": "Matches input elements with values within the specified range.",
  ":indeterminate":
    "Matches form elements in an indeterminate state, like partially-checked checkboxes.",
  ":invalid":
    "Matches form elements with invalid content according to their validation rules.",
  ":is()":
    "Matches elements that match any of the selectors in the list. Useful for grouping.",
  ":lang()":
    "Matches elements based on the language they are determined to be in.",
  ":last-child": "Matches an element that is the last child of its parent.",
  ":last-of-type": "Matches the last element of its type among siblings.",
  ":link": "Matches links that have not yet been visited.",
  ":modal":
    "Matches an element that is in a modal state, blocking interaction with others.",
  ":not()": "Matches elements that do not match the specified selector.",
  ":nth-child()":
    "Matches elements based on their position among siblings using a formula.",
  ":nth-last-child()":
    "Matches elements based on position from the end among siblings.",
  ":nth-last-of-type()":
    "Matches elements of the same type by position from the end.",
  ":nth-of-type()":
    "Matches elements of the same type based on position among siblings.",
  ":only-child": "Matches an element that is the only child of its parent.",
  ":only-of-type":
    "Matches an element that is the only one of its type among siblings.",
  ":open":
    "Matches elements like details or dialog when they are in an open state.",
  ":optional": "Matches form elements that are not required.",
  ":out-of-range":
    "Matches input elements with values outside the specified range.",
  ":placeholder-shown":
    "Matches input elements currently showing placeholder text.",
  ":read-only": "Matches elements that are not editable by the user.",
  ":read-write": "Matches elements that are editable by the user.",
  ":required":
    "Matches form elements that must be filled out before submitting.",
  ":root":
    "Matches the root element of the document, typically the <html> element.",
  ":target":
    "Matches an element whose ID matches the URL's fragment identifier.",
  ":user-invalid":
    "Matches form elements with invalid input after user interaction.",
  ":user-valid":
    "Matches form elements with valid input after user interaction.",
  ":valid":
    "Matches form elements with valid content according to their validation rules.",
  ":visited": "Matches links that have been visited by the user.",
  ":where()":
    "Like :is() but with zero specificity. Matches any selector in the list.",
  // Media-related
  ":paused":
    "Matches media elements like video or audio when playback is paused.",
  ":playing":
    "Matches media elements like video or audio when playback is active.",
  ":muted": "Matches media elements that are currently muted.",
  ":buffering": "Matches media elements that are buffering content.",
  ":seeking":
    "Matches media elements when the user is seeking to a new position.",
  ":stalled": "Matches media elements when the download has stalled.",
  ":volume-locked": "Matches media elements when volume cannot be changed.",
  // Picture-in-picture
  ":picture-in-picture":
    "Matches the element currently displayed in picture-in-picture mode.",
  // Popover
  ":popover-open": "Matches popover elements that are currently shown.",
};

// Descriptions for CSS pseudo-elements
export const pseudoElementDescriptions: Record<string, string> = {
  "::after":
    "Creates a virtual element as the last child of the selected element for inserting content.",
  "::before":
    "Creates a virtual element as the first child of the selected element for inserting content.",
  "::backdrop":
    "Styles the box behind a fullscreen or modal element, covering the entire viewport.",
  "::cue": "Styles the WebVTT cues (captions/subtitles) for media elements.",
  "::file-selector-button":
    "Styles the button of file input elements that opens the file picker.",
  "::first-letter":
    "Applies styles to the first letter of a block-level element.",
  "::first-line": "Applies styles to the first line of a block-level element.",
  "::grammar-error":
    "Styles text that the browser has flagged as grammatically incorrect.",
  "::highlight()":
    "Styles custom highlighted ranges created via the CSS Custom Highlight API.",
  "::marker": "Styles the marker box of list items, like bullets or numbers.",
  "::part()":
    "Styles elements within a shadow tree that have been exposed via the part attribute.",
  "::placeholder":
    "Styles the placeholder text in input and textarea elements.",
  "::selection":
    "Styles the portion of an element that is selected by the user.",
  "::slotted()": "Styles elements placed into a slot within a shadow tree.",
  "::spelling-error": "Styles text that the browser has flagged as misspelled.",
  "::target-text":
    "Styles the text fragment that was scrolled to via a URL fragment.",
  // View transitions
  "::view-transition": "Represents the root of the view transition overlay.",
  "::view-transition-group()":
    "Represents a single view transition snapshot group.",
  "::view-transition-image-pair()":
    "Represents the old and new views of a transition snapshot.",
  "::view-transition-new()":
    "Represents the new view state during a view transition.",
  "::view-transition-old()":
    "Represents the old view state during a view transition.",
  // Scroll markers
  "::scroll-marker":
    "Styles scroll markers generated for scroll snap containers.",
  "::scroll-marker-group": "Styles the container for scroll markers.",
  // Details
  "::details-content":
    "Styles the expandable content portion of a details element.",
  // Picker
  "::picker-icon": "Styles the icon in picker controls like date inputs.",
  "::picker()": "Styles the popup picker interface for form controls.",
  // Checkmark
  "::checkmark": "Styles the checkmark in checkbox or option elements.",
};
