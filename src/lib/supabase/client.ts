import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  // During build time the env vars may be placeholders — return a no-op proxy
  if (!url.startsWith("http")) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Proxy({} as ReturnType<typeof createBrowserClient>, {
      get: () => () => ({ data: null, error: null }),
    });
  }

  return createBrowserClient(url, key);
}
