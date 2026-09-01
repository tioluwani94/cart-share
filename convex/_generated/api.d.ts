/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accountDeletion from "../accountDeletion.js";
import type * as crons from "../crons.js";
import type * as households from "../households.js";
import type * as http from "../http.js";
import type * as items from "../items.js";
import type * as lists from "../lists.js";
import type * as notifications from "../notifications.js";
import type * as receiptTotal from "../receiptTotal.js";
import type * as restocks from "../restocks.js";
import type * as sessions from "../sessions.js";
import type * as storage from "../storage.js";
import type * as users from "../users.js";
import type * as vision from "../vision.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accountDeletion: typeof accountDeletion;
  crons: typeof crons;
  households: typeof households;
  http: typeof http;
  items: typeof items;
  lists: typeof lists;
  notifications: typeof notifications;
  receiptTotal: typeof receiptTotal;
  restocks: typeof restocks;
  sessions: typeof sessions;
  storage: typeof storage;
  users: typeof users;
  vision: typeof vision;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
