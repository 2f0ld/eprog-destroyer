/** Shared by the auth pages and the server (server/auth.ts): `name@ethz.ch` or `name@<sub>.ethz.ch`.
 *  The domain must start after "@" or a dot, so look-alikes such as `@fooethz.ch` or `@ethz.ch.evil.com` fail. */
export const ETH_EMAIL = /^[^@\s]+@([a-z0-9-]+\.)*ethz\.ch$/i
