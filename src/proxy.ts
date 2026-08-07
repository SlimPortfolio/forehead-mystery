import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Next 16 renamed `middleware` to `proxy`; this is the same network-boundary
 * hook under the new name (see node_modules/next/dist/docs — proxy.md).
 *
 * It deliberately does nothing but attach Clerk's session to the request, so
 * `auth()` resolves in server components and route handlers. Route protection
 * lives next to the data it guards (src/lib/admin.ts), which is both Clerk's
 * current recommendation — `createRouteMatcher` is deprecated — and safer:
 * an admin API route stays locked even if this matcher is ever mis-edited.
 */
export default clerkMiddleware();

/**
 * Scoped as narrowly as possible on purpose. Clerk's default matcher covers
 * the whole site, but the only routes that ever call `auth()` are the admin
 * area and its API — so the game, the join flow, /feedback, /winners and the
 * socket connection never touch Clerk at all, and can't be affected by it.
 *
 * `/__clerk` is Clerk's own handshake endpoint; the sign-in form on /admin
 * needs it.
 */
export const config = {
  matcher: ["/admin(.*)", "/api/admin/(.*)", "/__clerk/(.*)"],
};
