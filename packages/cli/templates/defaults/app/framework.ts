/* eslint-disable camelcase */

/**
 * To make route template framework agnostic, we re-export @remix-run/{adapter} types and functions here
 **/

export {
  type V2_MetaFunction,
  type LinksFunction,
  type LinkDescriptor,
  type ActionArgs,
  json,
} from "@remix-run/node";
