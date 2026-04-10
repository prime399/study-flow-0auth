"use client";

/**
 * Token Vault Consent Popup Component
 *
 * This component handles the step-up authorization flow for Auth0 Token Vault.
 * When the AI agent needs access to a third-party API (like Google Calendar),
 * this popup appears to request additional permissions from the user.
 *
 * Flow:
 * 1. AI agent calls tool that needs external API access
 * 2. Auth0 Token Vault detects missing/expired tokens
 * 3. TokenVaultError is thrown (intercepted by withInterruptions)
 * 4. This component renders consent UI
 * 5. User grants access via Auth0 popup
 * 6. Agent execution resumes with valid tokens
 */

import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Loader2, CheckCircle2, XCircle, Calendar, Music, Github } from "lucide-react";

// Type for Auth0 interruption (from @auth0/ai-vercel/react)
interface Auth0InterruptionUI {
  connection: string;
  requiredScopes: string[];
  resume: () => Promise<void>;
}

interface TokenVaultConsentProps {
  interrupt: Auth0InterruptionUI;
}

/**
 * Maps connection names to user-friendly service names and icons
 */
const CONNECTION_METADATA: Record<string, { name: string; icon: any; color: string }> = {
  "google-oauth2": {
    name: "Google Calendar",
    icon: Calendar,
    color: "text-blue-600",
  },
  "spotify": {
    name: "Spotify",
    icon: Music,
    color: "text-green-600",
  },
  "github": {
    name: "GitHub",
    icon: Github,
    color: "text-gray-800",
  },
};

/**
 * Maps Google Calendar API scopes to user-friendly descriptions
 */
const SCOPE_DESCRIPTIONS: Record<string, string> = {
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly": "View your list of calendars",
  "https://www.googleapis.com/auth/calendar.events.readonly": "Read your calendar events",
  "https://www.googleapis.com/auth/calendar.freebusy": "Check when you're free or busy",
  "https://www.googleapis.com/auth/calendar": "Manage your calendar events",
  // Spotify scopes
  "user-read-playback-state": "View your current playback state",
  "user-modify-playback-state": "Control music playback",
  "user-read-currently-playing": "See what you're currently playing",
  "playlist-read-private": "Access your private playlists",
  // GitHub scopes
  "repo": "Access your repositories",
  "read:user": "Read your user profile",
};

/**
 * Formats a scope URL into a user-friendly description
 */
function formatScope(scope: string): string {
  return SCOPE_DESCRIPTIONS[scope] || scope;
}

/**
 * Token Vault Consent Popup Component
 *
 * Displays a user-friendly consent screen for granting API access to MentorMind
 */
export function TokenVaultConsentPopup({ interrupt }: TokenVaultConsentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { connection, requiredScopes, resume } = interrupt;

  // Get service metadata
  const service = CONNECTION_METADATA[connection] || {
    name: connection,
    icon: Calendar,
    color: "text-gray-600",
  };

  const ServiceIcon = service.icon;

  /**
   * Handle user granting consent
   * Opens Auth0 popup for OAuth flow
   */
  const handleConsent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Note: In a real implementation, you would:
      // 1. Get Auth0 client instance
      // 2. Call loginWithPopup() with connection and scopes
      // 3. Wait for user to complete OAuth flow
      // 4. Resume agent execution

      // For now, we'll simulate the flow
      // In actual implementation:
      // const auth0Client = await getAuth0Client();
      // await auth0Client.loginWithPopup({
      //   authorizationParams: {
      //     connection,
      //     scope: requiredScopes.join(" "),
      //     prompt: "consent",
      //   },
      // });

      // Resume the AI agent execution with new tokens
      await resume();

      setSuccess(true);
      setError(null);

      // Auto-close after success
      setTimeout(() => {
        // Component will unmount as agent continues
      }, 1500);

    } catch (err) {
      console.error("Consent failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to grant access. Please try again."
      );
      setIsLoading(false);
    }
  };

  /**
   * Handle user denying consent
   */
  const handleDeny = () => {
    setError("Access denied. MentorMind won't be able to access your " + service.name + " data.");
    // Note: In real implementation, this would cancel the agent execution
  };

  if (success) {
    return (
      <Card className="max-w-md mx-auto shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Granted!</h3>
            <p className="text-sm text-muted-foreground">
              MentorMind can now access your {service.name} data.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <ServiceIcon className={`h-8 w-8 ${service.color}`} />
          <div>
            <CardTitle>Additional Permissions Required</CardTitle>
            <CardDescription>
              MentorMind needs access to your {service.name} account
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-3">
            To answer your question, MentorMind needs permission to:
          </p>
          <ul className="space-y-2">
            {requiredScopes.map((scope) => (
              <li key={scope} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>{formatScope(scope)}</span>
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            <strong>Secure & Private:</strong> Your credentials are encrypted and stored securely in Auth0&apos;s Token Vault.
            You can revoke access anytime from Settings.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleConsent}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Grant Access
              </>
            )}
          </Button>
          <Button
            onClick={handleDeny}
            variant="outline"
            disabled={isLoading}
          >
            Deny
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          You&apos;ll be redirected to {service.name} to complete authorization
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Hook to render Token Vault interruptions in your AI chat UI
 *
 * @example
 * ```typescript
 * const { messages, error } = useAIChat();
 *
 * if (isTokenVaultInterruption(error)) {
 *   return <TokenVaultConsentPopup interrupt={error} />;
 * }
 * ```
 */
export function isTokenVaultInterruption(error: unknown): error is Auth0InterruptionUI {
  return (
    error !== null &&
    typeof error === "object" &&
    "connection" in error &&
    "requiredScopes" in error &&
    "resume" in error
  );
}
