/**
 * This code is based on work from the web.dev project by GoogleChrome.
 * Source: https://github.com/GoogleChrome/web.dev/blob/a64d870f59c25431bbedf0ef06aa635072c43a2e/src/lib/analytics.js
 * Licensed under CC BY 3.0: https://creativecommons.org/licenses/by/3.0/ https://github.com/GoogleChrome/web.dev/blob/main/LICENSE
 * Changes were made to the original work.
 */

import {
  onCLS,
  onFCP,
  onFID,
  onINP,
  onLCP,
  onTTFB,
  type CLSReportCallbackWithAttribution,
  type FCPReportCallbackWithAttribution,
  type FIDReportCallbackWithAttribution,
  type INPReportCallbackWithAttribution,
  type LCPReportCallbackWithAttribution,
  type TTFBReportCallbackWithAttribution,
  type ReportOpts,
  // eslint-disable-next-line import/no-internal-modules
} from "web-vitals/attribution";

const logEvent = (
  name: string,
  params: {
    /* */
    metric_value: number;
  }
) => {
  performance.measure(`${name}`, {
    detail: JSON.stringify(params),
    duration: params.metric_value,
    start: performance.now(),
  });

  console.info(JSON.stringify({ name, params }));
};

const buildElementHumanReadablePath = (element: Element) => {
  let content =
    element.tagName + " > " + (element?.textContent ?? "").slice(0, 100);

  let node: null | Element = element;

  while (node != null) {
    content = node.tagName + " > " + content;
    node = node.parentElement;
  }

  return content;
};

const sendToAnalitics: CLSReportCallbackWithAttribution &
  FCPReportCallbackWithAttribution &
  FIDReportCallbackWithAttribution &
  INPReportCallbackWithAttribution &
  LCPReportCallbackWithAttribution &
  TTFBReportCallbackWithAttribution = ({
  name,
  value,
  delta,
  id,
  attribution,
  navigationType,
}) => {
  const params = {
    event_category: "Web Vitals",
    // The `id` value will be unique to the current page load. When sending
    // multiple values from the same page (e.g. for CLS), Google Analytics can
    // compute a total by grouping on this ID (note: requires `eventLabel` to
    // be a dimension in your report).
    event_label: id,
    // Google Analytics metrics must be integers, so the value is rounded.
    // For CLS the value is first multiplied by 1000 for greater precision
    // (note: increase the multiplier for greater precision if needed).
    value: Math.round(name === "CLS" ? delta * 1000 : delta),
    // Send the raw metric value in addition to the value computed for GA
    // so it's available in BigQuery and the API.
    metric_value: value,
    // This should already by set globally, but to ensure it's consistent
    // with the web-vitals library, set it again.
    // Override for 'navigational-prefetch' for the prefetch origin trial
    // experiment (https://github.com/GoogleChrome/web.dev/pull/9532)
    navigation_type:
      navigationType === "navigate" &&
      performance.getEntriesByType &&
      performance.getEntriesByType("navigation")[0] &&
      (
        performance.getEntriesByType("navigation")[0] as unknown as {
          deliveryType: string;
        }
      ).deliveryType === "navigational-prefetch"
        ? "navigational-prefetch"
        : navigationType,
    url: location.href,

    debug_target_path: undefined as unknown as string,
    last_touched_path: undefined as unknown as string,
  };

  let overrides;
  let debugInputDelay;
  let debugProcessingTime;
  let debugPresentationDelay;

  switch (name) {
    case "CLS":
      overrides = {
        debug_time: attribution.largestShiftTime,
        debug_load_state: attribution.loadState,
        debug_target: attribution.largestShiftTarget || "(not set)",
      };
      break;
    case "FCP":
      overrides = {
        debug_ttfb: attribution.timeToFirstByte,
        debug_fb2fcp: attribution.firstByteToFCP,
        debug_load_state: attribution.loadState,
        debug_target: attribution.loadState || "(not set)",
      };
      break;
    case "FID":
      overrides = {
        debug_event: attribution.eventType,
        debug_time: attribution.eventTime,
        debug_load_state: attribution.loadState,
        debug_target: attribution.eventTarget || "(not set)",
      };
      break;
    case "INP":
      if (attribution.eventEntry) {
        debugInputDelay = Math.round(
          attribution.eventEntry.processingStart -
            attribution.eventEntry.startTime
        );
        debugProcessingTime = Math.round(
          attribution.eventEntry.processingEnd -
            attribution.eventEntry.processingStart
        );
        debugPresentationDelay = Math.round(
          // RenderTime is an estimate, because duration is rounded, and may get rounded down.
          // In rare cases it can be less than processingEnd and that breaks performance.measure().
          // Lets make sure its at least 4ms in those cases so you can just barely see it.
          Math.max(
            attribution.eventEntry.processingEnd + 4,
            attribution.eventEntry.startTime + attribution.eventEntry.duration
          ) - attribution.eventEntry.processingEnd
        );
      }
      overrides = {
        debug_event: attribution.eventType,
        debug_time: attribution.eventTime,
        debug_load_state: attribution.loadState,
        debug_target: attribution.eventTarget || "(not set)",
        debug_input_delay: debugInputDelay,
        debug_processing_time: debugProcessingTime,
        debug_presentation_delay: debugPresentationDelay,
      };
      break;
    case "LCP":
      overrides = {
        debug_url: attribution.url,
        debug_ttfb: attribution.timeToFirstByte,
        debug_rld: attribution.resourceLoadDelay,
        debug_rlt: attribution.resourceLoadTime,
        debug_erd: attribution.elementRenderDelay,
        debug_target: attribution.element || "(not set)",
      };
      break;
    case "TTFB":
      overrides = {
        debug_waiting_time: attribution.waitingTime,
        debug_dns_time: attribution.dnsTime,
        debug_connection_time: attribution.connectionTime,
        debug_request_time: attribution.requestTime,
      };
      break;
  }

  let selector = "";
  if ("debug_target" in overrides && overrides.debug_target !== "(not set)") {
    try {
      // Fix radix like selectors with `:` inside
      selector = overrides.debug_target.replace(/([:])/g, "\\$1");
      const element = document.querySelector(selector);

      if (element) {
        const content = buildElementHumanReadablePath(element);
        params.debug_target_path = content;
      }
    } catch (e) {
      console.error(e);

      console.error(`selector: ${selector} seems like not working`);
    }
  }

  logEvent(name, Object.assign(params, overrides, { is_mobile: _isMobile }));
};

let _subscribed = false;
let _isMobile = false;

export const subscribe = () => {
  const reportOptions: ReportOpts = {
    durationThreshold: 0,
    reportAllChanges: true,
  };

  if (_subscribed === false) {
    onCLS(sendToAnalitics, reportOptions);
    onFCP(sendToAnalitics, reportOptions);
    onFID(sendToAnalitics, reportOptions);
    onINP(sendToAnalitics, reportOptions);
    onLCP(sendToAnalitics, reportOptions);
    onTTFB(sendToAnalitics, reportOptions);
  }

  try {
    _isMobile = window.matchMedia("(hover: none)").matches;
  } catch (e) {
    console.error(e);
  }

  const options = {
    capture: true,
    passive: true,
  };

  _subscribed = true;

  return () => {};
};
