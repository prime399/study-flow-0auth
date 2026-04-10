/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as adaptiveCalendar from "../adaptiveCalendar.js";
import type * as auth from "../auth.js";
import type * as googleCalendar from "../googleCalendar.js";
import type * as groups from "../groups.js";
import type * as http from "../http.js";
import type * as leaderboards from "../leaderboards.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as messages from "../messages.js";
import type * as moderators from "../moderators.js";
import type * as onboarding from "../onboarding.js";
import type * as scheduling from "../scheduling.js";
import type * as spotify from "../spotify.js";
import type * as study from "../study.js";
import type * as testHelpers from "../testHelpers.js";
import type * as todos from "../todos.js";
import type * as userApiKeys from "../userApiKeys.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  adaptiveCalendar: typeof adaptiveCalendar;
  auth: typeof auth;
  googleCalendar: typeof googleCalendar;
  groups: typeof groups;
  http: typeof http;
  leaderboards: typeof leaderboards;
  "lib/encryption": typeof lib_encryption;
  messages: typeof messages;
  moderators: typeof moderators;
  onboarding: typeof onboarding;
  scheduling: typeof scheduling;
  spotify: typeof spotify;
  study: typeof study;
  testHelpers: typeof testHelpers;
  todos: typeof todos;
  userApiKeys: typeof userApiKeys;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
