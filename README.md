# @dream-mythic/web-tracking

A TypeScript tracking client for React 18/19, Next.js App Router and Pages
Router, and standard React SPAs. React and React DOM are peer dependencies and
are not bundled. The SDK has no default backend: applications must configure an
absolute HTTP(S) backend URL and an app ID.

The authentication change adds a request header only; existing event and
session JSON bodies are unchanged.

## Installation

```sh
npm install @dream-mythic/web-tracking
```

The package supports React 18 and 19. Next.js is optional and is not imported
by the generic package entry point.

For Next.js, set public client-side configuration in `.env.local`:

```dotenv
NEXT_PUBLIC_WEB_TRACKING_BACKEND_URL=https://your-backend-domain.com
NEXT_PUBLIC_WEB_TRACKING_APP_ID=dream-mythic
NEXT_PUBLIC_WEB_TRACKING_TOKEN=1234567890123456789012345678901234567890
```

`NEXT_PUBLIC_` values are included in browser bundles. They are public and
must never contain administrative secrets, credentials, or private API keys.
Replace the example token with the value configured in the backend. A
client-side tracking token is visible to browser users and is only a basic
shared access gate.

## Configuration

Wrap the application in `WebTrackingProvider`:

```tsx
"use client";

import { WebTrackingProvider } from "@dream-mythic/web-tracking";

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  return (
    <WebTrackingProvider
      backendUrl="https://api.example.com"
      appId="dream-mythic"
      token={process.env.NEXT_PUBLIC_WEB_TRACKING_TOKEN ?? ""}
      enabled
      debug={false}
      heartbeatInterval={25_000}
    >
      {children}
    </WebTrackingProvider>
  );
}
```

`backendUrl` must be a valid absolute HTTP(S) URL. Trailing slashes are removed.
`appId` must be non-empty, and `token` must contain exactly 40 numeric digits.
All three are required; there is no invented backend or authentication
fallback. Missing or invalid tokens throw a configuration error before any
request can be sent.

| Option              | Default  | Description                                                                                                                                                     |
| ------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backendUrl`        | required | Backend origin/base URL.                                                                                                                                        |
| `appId`             | required | Public identifier for the application.                                                                                                                          |
| `token`             | required | Exactly 40 numeric digits; sent in `X-Web-Tracking-Token` on every SDK request.                                                                                 |
| `enabled`           | `true`   | Disables all tracking requests when false.                                                                                                                      |
| `debug`             | `false`  | Enables sanitized diagnostic messages only.                                                                                                                     |
| `heartbeatInterval` | `25000`  | Session heartbeat period in milliseconds.                                                                                                                       |
| `trackPageViews`    | `true`   | Sends initial and explicitly reported page views.                                                                                                               |
| `trackPerformance`  | `true`   | Adds available navigation performance measurements to page views.                                                                                               |
| `consent`           | allowed  | Boolean or `{ required, granted }`; required but ungranted consent blocks requests.                                                                             |
| `requestTimeout`    | `10000`  | Request timeout in milliseconds.                                                                                                                                |
| `retryCount`        | `0`      | Retries transient failures, capped at five. Retries are opt-in; enabling them can duplicate events if the server processed a request but its response was lost. |
| `maxQueueSize`      | `100`    | Maximum in-memory event queue size. Oldest queued events are dropped at the limit.                                                                              |

## Integrations

### Next.js App Router

Put a client provider beneath the root layout's `<body>`. Use the small route
adapter below (also available in `examples/nextjs-app/integration.example.tsx`)
to report navigation changes:

```tsx
"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  WebTrackingProvider,
  useWebTracking,
} from "@dream-mythic/web-tracking";

function RouteTracking() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { trackPageView } = useWebTracking();
  const query = searchParams.toString();

  useEffect(() => {
    void trackPageView({
      url: `${window.location.origin}${pathname}${query ? `?${query}` : ""}`,
    });
  }, [pathname, query, trackPageView]);
  return null;
}

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  return (
    <WebTrackingProvider
      backendUrl={process.env.NEXT_PUBLIC_WEB_TRACKING_BACKEND_URL ?? ""}
      appId={process.env.NEXT_PUBLIC_WEB_TRACKING_APP_ID ?? ""}
      token={process.env.NEXT_PUBLIC_WEB_TRACKING_TOKEN ?? ""}
    >
      <RouteTracking />
      {children}
    </WebTrackingProvider>
  );
}
```

### Next.js Pages Router

Mount the provider in `pages/_app.tsx`. In a child component, subscribe to
`router.events` and call `trackPageView({ url })` on `routeChangeComplete`.
Remove the event listener in the effect cleanup. The SDK suppresses consecutive
duplicate canonical URLs.

### Standard React SPA

Use the provider around your application. Call `trackPageView` from your
router's navigation-complete callback (or after your own history navigation).
This avoids patching or globally replacing browser history APIs.

```tsx
<WebTrackingProvider backendUrl={backendUrl} appId="shop" token={trackingToken}>
  <App />
</WebTrackingProvider>
```

## Custom events

```tsx
"use client";

import { useWebTracking } from "@dream-mythic/web-tracking";

export function SignupButton() {
  const { trackEvent } = useWebTracking();
  return (
    <button
      onClick={() =>
        void trackEvent("signup_button_clicked", {
          buttonId: "signup",
          placement: "header",
        })
      }
    >
      Sign up
    </button>
  );
}
```

Provider-bound methods handle and optionally report request errors, so event
handlers do not create unhandled promise rejections. Never include form values,
passwords, payment data, personal data, or sensitive query parameters in event
properties.

Outside React, configure an explicit client instance. Do not share mutable
global clients across apps with different endpoints or app IDs:

```ts
import { WebTrackingClient, trackEvent } from "@dream-mythic/web-tracking";

const client = new WebTrackingClient({
  backendUrl: "https://api.example.com",
  appId: "worker-dashboard",
  token: process.env.NEXT_PUBLIC_WEB_TRACKING_TOKEN ?? "",
});
await trackEvent(client, "report_exported", { format: "csv" });
```

`client.trackEvent(name, properties)`, `client.trackPageView(options)`,
`client.startSession()`, `client.heartbeat()`, `client.endSession()`,
`client.flushEvents()`, and `client.queryAnalytics(endpoint, parameters)` are
available. Named analytics methods `getRealtime`, `getOverview`, `getPages`,
`getEvents`, `getSources`, `getDevices`, `getLocations`, `getFunnels`, and
`getPerformance` are also available. Analytics GET queries are never called
automatically. Every GET and POST request includes `X-Web-Tracking-Token`.

## Backend API and payload assumptions

All paths are relative to `backendUrl`. Collect/session/batch methods use POST;
analytics query methods use GET. The browser sends JSON with CORS mode, omits
cookies and credentials, and authenticates all fourteen routes with the
`X-Web-Tracking-Token` header. Missing or incorrect tokens receive HTTP `401
Unauthorized`.

| Method | Path                                  | Purpose                              |
| ------ | ------------------------------------- | ------------------------------------ |
| POST   | `/api/web-tracking/collect`           | One event.                           |
| POST   | `/api/web-tracking/batch`             | `{ appId, events: EventPayload[] }`. |
| POST   | `/api/web-tracking/session/start`     | Session initialization.              |
| POST   | `/api/web-tracking/session/heartbeat` | Session activity.                    |
| POST   | `/api/web-tracking/session/end`       | Session termination.                 |
| GET    | `/api/web-tracking/realtime`          | Optional analytics query.            |
| GET    | `/api/web-tracking/overview`          | Optional analytics query.            |
| GET    | `/api/web-tracking/pages`             | Optional analytics query.            |
| GET    | `/api/web-tracking/events`            | Optional analytics query.            |
| GET    | `/api/web-tracking/sources`           | Optional analytics query.            |
| GET    | `/api/web-tracking/devices`           | Optional analytics query.            |
| GET    | `/api/web-tracking/locations`         | Optional analytics query.            |
| GET    | `/api/web-tracking/funnels`           | Optional analytics query.            |
| GET    | `/api/web-tracking/performance`       | Optional analytics query.            |

Event fields sent by the SDK are `appId`, `visitorId`, `sessionId`, `eventName`,
`pageUrl`, `pageTitle`, `referrer`, `source`, `device`, `browser`, optional
`properties`, and ISO-8601 `timestamp`. Session payloads contain `appId`,
`visitorId`, `sessionId`, `pageUrl`, `referrer`, and `timestamp`. The server
validates required fields and must allow the application's origin through
CORS. In the current `app-analytics` backend, `source` and `device` are defined
as strings, while this SDK sends structured objects for those fields; the
backend currently falls back to `direct`/`unknown` for those values. This
existing payload-contract mismatch is not changed by token authentication and
should be aligned separately if campaign/device breakdowns are required.
Successful empty responses are supported; non-empty successful POST responses
are expected to contain valid JSON.

The SDK sanitizes page URLs by retaining only the five `utm_*` campaign
parameters and removing fragments and other query parameters. Referrals are
represented by hostname, not full referrer URL. Do not put sensitive data in
UTM values.

## Backend token and security limitations

Configure the backend with `WEB_TRACKING_TOKEN` set to the same exact
40-digit numeric value supplied to the SDK. Copy `.env.example` to `.env` and
populate the token in the backend repository. Generate a value with
`node -e "process.stdout.write(Array.from({length:40}, () => require('node:crypto').randomInt(0,10)).join(''))"`.
The backend validates this configuration at startup and refuses to start if
it is missing or malformed.
In production, configure `CORS_ORIGINS` as a comma-separated allowlist of
intended application origins; CORS is not authentication.

The client-side token is visible in the downloaded JavaScript and browser
network tools. Anyone who obtains it can use it for **both** public tracking
POSTs and analytics GETs. Do not use this token to protect sensitive admin
analytics or store administrative credentials in `NEXT_PUBLIC_*` variables.
For production, use separate credentials and authenticated server-side access
for analytics reads, plus rate limiting/abuse controls for public tracking
POSTs. Treat this token only as a basic shared access gate.

## Session, consent, and privacy

Visitor IDs are stored in local storage and session IDs in session storage.
Storage errors are handled by using an in-memory generated ID for that call.
Session start occurs when the provider is active, heartbeats run at the
configured interval, and `pagehide` sends a keepalive fetch to the session-end
endpoint so the required authentication header can be attached. Browser
shutdown lifecycle events are not guaranteed.
Intervals/listeners are removed when the provider unmounts.

Pass `consent={false}` to prevent tracking until granted, then call
`setConsent(true)` from `useWebTracking()`. `disableTracking(true)` stops future
requests and clears locally stored IDs. The provider does not transmit
credentials or inspect the DOM or form fields.

Operators are responsible for obtaining legally appropriate consent, configuring
retention, handling deletion/access requests, and evaluating applicable
jurisdictional requirements. This SDK does not guarantee legal compliance.

## Errors and diagnostics

The low-level client rejects requests on network/CORS errors, timeouts,
non-2xx responses, and malformed JSON. Provider context methods contain those
failures to avoid unhandled event-handler rejections. Debug logging contains
only generic diagnostic messages and never logs payloads or credentials.

Common checks:

- Confirm `NEXT_PUBLIC_WEB_TRACKING_BACKEND_URL` and
  `NEXT_PUBLIC_WEB_TRACKING_APP_ID` are set in the browser build.
- Confirm `NEXT_PUBLIC_WEB_TRACKING_TOKEN` is exactly 40 digits and matches the
  backend `WEB_TRACKING_TOKEN`.
- Check the backend CORS allowlist and that preflight permits `Content-Type`.
- Confirm server routes and request fields match the assumptions above.
- Check browser network tools for status/timeout information; the SDK intentionally
  avoids logging user data.
- Ensure a route adapter calls `trackPageView` after client-side navigation.

## Development and publishing

```sh
npm install
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

Run the backend authentication suite from the backend repository with
`cd ../app-analytics && npm test`. Configure `WEB_TRACKING_TOKEN` before
starting the backend; an invalid or absent value causes startup to fail.

To publish, a maintainer must:

1. Create/sign in to an npm account.
2. Verify `@dream-mythic/web-tracking` is available and the account can publish
   under the `@dream-mythic` scope.
3. Run all checks above and inspect `npm pack --dry-run`.
4. Authenticate with `npm login`.
5. Publish explicitly with `npm publish --access public`.
6. Install the published package in each application with
   `npm install @dream-mythic/web-tracking`.
7. Release future updates by incrementing the semantic version, then rerunning
   checks before publishing.

This repository has not published the package. Replace the maintainer
repository/issue tracker metadata in `package.json` before release.
