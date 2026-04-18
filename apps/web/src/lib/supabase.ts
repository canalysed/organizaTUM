import { createBrowserClient, createServerClient } from "@supabase/ssr";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

// Browser client — for client components (auth operations)
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Server client — for middleware and route handlers (reads/writes auth cookies)
export function createServerSupabaseClient(cookieStore: ReadonlyRequestCookies) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              (cookieStore as unknown as { set: (name: string, value: string, options: unknown) => void }).set(name, value, options);
            });
          } catch {
            // setAll called from a Server Component — middleware handles refresh
          }
        },
      },
    },
  );
}
