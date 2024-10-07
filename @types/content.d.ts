// CSS Containment
// Specification: https://drafts.csswg.org/css-contain-2/
// Repository: https://github.com/w3c/csswg-drafts/tree/main/css-contain-2

declare var oncontentvisibilityautostatechange: ContentVisibilityAutoStateChangeEvent | null;

interface GlobalEventHandlersEventMap {
  contentvisibilityautostatechange: ContentVisibilityAutoStateChangeEvent;
}
