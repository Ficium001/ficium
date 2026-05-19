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

export type AuthError = {
  code:
    | "email_already_registered"
    | "weak_password"
    | "invalid_email"
    | "network"
    | "unknown";
  message: string;
};

export type SignUpResult =
  | { ok: true; userId: string; needsEmailConfirmation: boolean }
  | { ok: false; error: AuthError };

export type SignInResult =
  | { ok: true; userId: string }
  | { ok: false; error: AuthError };

/* ---------- Sign up ---------- */

/**
 * Create a new auth account. Profile fields are passed as user metadata;
 * a database trigger (handle_new_user) reads that metadata and creates
 * the matching public.users row automatically. So this function only
 * makes ONE network call, and the client code never touches public.users
 * directly during signup — which keeps RLS strict and avoids
 * "orphaned auth account" edge cases.
 */
export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  const { email, password, firstName, middleName, lastName, phone, title } = input;
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ").trim();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        first_name: firstName,
        middle_name: middleName || "",
        last_name: lastName,
        phone: phone || "",
        title: title || "",
      },
    },
  });

  if (error) return { ok: false, error: mapAuthError(error) };
  if (!data.user) {
    return { ok: false, error: { code: "unknown", message: "Sign up did not return a user." } };
  }

  return {
    ok: true,
    userId: data.user.id,
    needsEmailConfirmation: !data.session,
  };
}

/* ---------- Bank sign up ---------- */

export type SignUpBankInput = {
  email: string;
  password: string;
  institutionName: string;
  firstName: string;
  lastName: string;
  phone?: string;
  title?: string;
};

export async function signUpBank(input: SignUpBankInput): Promise<SignUpResult> {
  const { email, password, institutionName, firstName, lastName, phone, title } = input;
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        phone: phone || "",
        title: title || "",
        role: "bank",
        institution_name: institutionName,
      },
    },
  });

  if (error) return { ok: false, error: mapAuthError(error) };
  if (!data.user) {
    return { ok: false, error: { code: "unknown", message: "Sign up did not return a user." } };
  }

  return {
    ok: true,
    userId: data.user.id,
    needsEmailConfirmation: !data.session,
  };
}




/* ---------- Sign in ---------- */

export async function signIn(email: string, password: string): Promise<SignInResult> {
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
    return { code: "email_already_registered", message: "An account with this email already exists." };
  }
  if (msg.includes("password") && (msg.includes("weak") || msg.includes("short"))) {
    return { code: "weak_password", message: "Password is too weak. Use at least 8 characters." };
  }
  if (msg.includes("email") && msg.includes("invalid")) {
    return { code: "invalid_email", message: "That doesn't look like a valid email address." };
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return { code: "network", message: "Network error. Check your connection and try again." };
  }
  return { code: "unknown", message: err.message || "Something went wrong. Please try again." };
}