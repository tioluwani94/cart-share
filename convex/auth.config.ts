/**
 * Convex auth configuration for Clerk JWT validation
 *
 * This configures Convex to validate JWTs issued by Clerk.
 * The CLERK_JWT_ISSUER_DOMAIN environment variable should be set
 * in the Convex dashboard (e.g., https://verb-noun-00.clerk.accounts.dev)
 */

const authConfig = {
  providers: [
    {
      // Clerk JWT provider configuration
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
