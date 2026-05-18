import { supabase } from "../lib/supabase";

/* ---------- Types ---------- */

export type SignUpInput = {
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  title?: string;
};

export type SignUpResult =
  | { ok: true; userId: string; needsEmailConfirmation: boolean }
  | { ok: false; error: AuthError };

export type AuthError = {
  code:
    | "email_already_registered"
    | "weak_password"
    | "invalid_email"
    | "profile_insert_failed"
    | "network"
    | "unknown";
  message: string;
};

/* ---------- Sign up ---------- */

/**
 * Creates a Supabase Auth account, then inserts the corresponding row in public.users.
 * Returns a discriminated union so callers can handle success/error without try/catch.
 *
 * The two operations are NOT in a database transaction (Supabase Auth and our table
 * are technically separate). If the auth account is created but the users-row insert
 * fails, we surface a clear error so the user can retry; the orphaned auth account
 * is rare and cleaned up by a future maintenance task.
 */
export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  const { email, password, firstName, middleName, lastName, phone, title } = input;

  const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ").trim();

  // 1. Create the auth account
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (authError) return { ok: false, error: mapAuthError(authError) };
  if (!authData.user) {
    return {
      ok: false,
      error: { code: "unknown", message: "Sign up did not return a user." },
    };
  }

  const userId = authData.user.id;
  const needsEmailConfirmation = !authData.session;

  // 2. Insert the matching public.users row
  const { error: profileError } = await supabase.from("users").insert({
    id: userId,
    email,
    full_name: fullName,
    first_name: firstName,
    middle_name: middleName || null,
    last_name: lastName,
    phone: phone || null,
    title: title || null,
    role: "client",
    kyc_status: "pending",
  });

  if (profileError) {
    return {
      ok: false,
      error: {
        code: "profile_insert_failed",
        message: profileError.message,
      },
    };
  }

  return { ok: true, userId, needsEmailConfirmation };
}

/* ---------- Sign in ---------- */

export async function signIn(
  email: string,
  password: string
): Promise<{ ok: true; userId: string } | { ok: false; error: AuthError }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: mapAuthError(error) };
  if (!data.user) {
    return { ok: false, error: { code: "unknown", message: "Sign in did not return a user." } };
  }
  return { ok: true, userId: data.user.id };
}

/* ---------- Sign out ---------- */

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/* ---------- Current user ---------- */

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/* ---------- Error mapping ---------- */

function mapAuthError(err: { message?: string; code?: string; status?: number }): AuthError {
  const msg = (err.message || "").toLowerCase();

  if (msg.includes("already registered") || msg.includes("user already")) {
    return {
      code: "email_already_registered",
      message: "An account with this email already exists.",
    };
  }
  if (msg.includes("password") && (msg.includes("weak") || msg.includes("short"))) {
    return {
      code: "weak_password",
      message: "Password is too weak. Use at least 8 characters.",
    };
  }
  if (msg.includes("email") && msg.includes("invalid")) {
    return { code: "invalid_email", message: "That doesn't look like a valid email address." };
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return { code: "network", message: "Network error. Check your connection and try again." };
  }
  return { code: "unknown", message: err.message || "Something went wrong. Please try again." };
}