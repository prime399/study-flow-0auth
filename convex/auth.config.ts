const authDomainEnv =
  process.env.CONVEX_SITE_URL ||
  process.env.SITE_URL ||
  process.env.APP_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL

if (!authDomainEnv) {
  throw new Error(
    "Missing auth domain env var. Set one of: CONVEX_SITE_URL, SITE_URL, APP_BASE_URL, NEXT_PUBLIC_APP_URL."
  )
}

export default {
  providers: [
    {
      domain: authDomainEnv.replace(/\/+$/, ""),
      applicationID: "convex",
    },
  ],
}
