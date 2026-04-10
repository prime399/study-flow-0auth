import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export type CalendarPermission = "read" | "create" | "modify" | "delete";

/**
 * Check if a user has a specific Google Calendar permission
 * This integrates with Auth0 fine-grained authorization
 */
export async function hasCalendarPermission(
  convexClient: ConvexHttpClient,
  permission: CalendarPermission
): Promise<boolean> {
  try {
    const hasPermission = await convexClient.query(
      api.googleCalendar.hasPermission,
      { permission }
    );
    return hasPermission ?? false;
  } catch (error) {
    console.error("Error checking calendar permission:", error);
    return false;
  }
}

/**
 * Get all calendar permissions for the authenticated user
 */
export async function getCalendarPermissions(
  convexClient: ConvexHttpClient
): Promise<{
  canReadEvents: boolean;
  canCreateEvents: boolean;
  canModifyEvents: boolean;
  canDeleteEvents: boolean;
}> {
  try {
    const permissions = await convexClient.query(
      api.googleCalendar.getPermissions
    );

    if (!permissions) {
      // Return default permissions
      return {
        canReadEvents: true,
        canCreateEvents: true,
        canModifyEvents: false,
        canDeleteEvents: false,
      };
    }

    return {
      canReadEvents: permissions.canReadEvents ?? true,
      canCreateEvents: permissions.canCreateEvents ?? true,
      canModifyEvents: permissions.canModifyEvents ?? false,
      canDeleteEvents: permissions.canDeleteEvents ?? false,
    };
  } catch (error) {
    console.error("Error getting calendar permissions:", error);
    return {
      canReadEvents: false,
      canCreateEvents: false,
      canModifyEvents: false,
      canDeleteEvents: false,
    };
  }
}

/**
 * Permission error class for unauthorized calendar operations
 */
export class CalendarPermissionError extends Error {
  constructor(permission: CalendarPermission) {
    super(
      `Insufficient permissions: You don't have permission to ${permission} calendar events. Please enable this permission in your Google Calendar settings.`
    );
    this.name = "CalendarPermissionError";
  }
}

/**
 * Enforce permission check before calendar operation
 * Throws CalendarPermissionError if permission is not granted
 */
export async function enforceCalendarPermission(
  convexClient: ConvexHttpClient,
  permission: CalendarPermission
): Promise<void> {
  const hasPermission = await hasCalendarPermission(convexClient, permission);

  if (!hasPermission) {
    throw new CalendarPermissionError(permission);
  }
}

/**
 * Map calendar operation to required permission
 */
export function getRequiredPermission(
  operation: "list" | "create" | "update" | "delete"
): CalendarPermission {
  switch (operation) {
    case "list":
      return "read";
    case "create":
      return "create";
    case "update":
      return "modify";
    case "delete":
      return "delete";
    default:
      throw new Error(`Unknown calendar operation: ${operation}`);
  }
}
