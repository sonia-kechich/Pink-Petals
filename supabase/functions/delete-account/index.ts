// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  delete-account — privileged auth-user deletion (Supabase Edge Function)   ║
// ║                                                                            ║
// ║  A client using the anon key CANNOT delete its own auth.users row. This   ║
// ║  function runs server-side with the SERVICE ROLE key, verifies the        ║
// ║  caller's JWT, then deletes that user (cascades to profiles + user_data    ║
// ║  via the ON DELETE CASCADE foreign keys in schema.sql).                    ║
// ║                                                                            ║
// ║  DEPLOY (see docs/SECURITY_AND_OPS.md for the full checklist):             ║
// ║    supabase functions deploy delete-account                                ║
// ║    supabase secrets set SERVICE_ROLE_KEY=<service-role-key>                ║
// ║  The SUPABASE_URL secret is provided by the platform automatically.        ║
// ║                                                                            ║
// ║  NOTE: This file targets the Deno edge runtime, not the app's Vite build;  ║
// ║  it is intentionally OUTSIDE src/ so tsc/vite never compile it.            ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// @ts-nocheck — Deno runtime, resolved at deploy time (not by the app's tsconfig).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) {
    return new Response(JSON.stringify({ error: "Missing Authorization" }), { status: 401 });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500 });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Verify the caller's identity from their JWT — never trust a client-supplied id.
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
  }

  const userId = userData.user.id;

  // Defensively delete the data row first (FK cascade also covers this).
  await admin.from("user_data").delete().eq("user_id", userId);

  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    return new Response(JSON.stringify({ error: delErr.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
