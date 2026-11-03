# Next.js integration example

The generic SDK has no dependency on Next.js. See `integration.example.tsx` for
an App Router provider and route-change adapter. For Pages Router, invoke the
same `trackPageView` method from `router.events` on `routeChangeComplete`.
