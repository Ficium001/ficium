import { supabase } from "./supabase";
import { audit } from "./audit";

/* ============================================================
   TYPES
   ============================================================ */

export type AuthError = {
  code:
    | "email_already_registered"
    | "weak_password"
    | "invalid_email"
    | "invalid_credentials"
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

/* ============================================================
   INDIVIDUAL SIGN UP
   ============================================================ */

export type SignUpIndividualInput = {
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  title?: string;
  country: string;
  /** Optional — captured via the signup-time "Scan NIC" flow. */
  dateOfBirth?: string; // YYYY-MM-DD
  gender?: "M" | "F";
};

export async function signUpIndividual(input: SignUpIndividualInput): Promise<SignUpResult> {
  const { email, password, firstName, middleName, lastName, phone, title, country, dateOfBirth, gender } = input;
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ").trim();

  const { data, error } = await withNetworkRetry(() =>
    supabase.auth.signUp({
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
          role: "client",
          user_type: "individual",
          country,
          date_of_birth: dateOfBirth || "",
          gender: gender || "",
        },
      },
    })
  );

  if (error) return { ok: false, error: mapAuthError(error) };
  if (!data.user) return { ok: false, error: { code: "unknown", message: "Sign up did not return a user." } };

  await audit.login();
  return { ok: true, userId: data.user.id, needsEmailConfirmation: !data.session };
}

/* ============================================================
   BUSINESS SIGN UP
   ============================================================ */

export type SignUpBusinessInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  companyRegistration?: string;
  phone?: string;
  country: string;
};

export async function signUpBusiness(input: SignUpBusinessInput): Promise<SignUpResult> {
  const { email, password, firstName, lastName, companyName, companyRegistration, phone, country } = input;
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  const { data, error } = await withNetworkRetry(() =>
    supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          phone: phone || "",
          role: "client",
          user_type: "business",
          company_name: companyName,
          company_registration: companyRegistration || "",
          country,
        },
      },
    })
  );

  if (error) return { ok: false, error: mapAuthError(error) };
  if (!data.user) return { ok: false, error: { code: "unknown", message: "Sign up did not return a user." } };

  await audit.login();
  return { ok: true, userId: data.user.id, needsEmailConfirmation: !data.session };
}


/* ============================================================
   SIGN IN
   ============================================================ */

/** Retries a Supabase auth call up to `attempts` times with short backoff,
 *  but only for transient network/edge failures (fetch errors, 5xx/522
 *  gateway timeouts) — never retries genuine auth failures like wrong
 *  password, since retrying those wastes time and risks rate-limit lockout. */
async function withNetworkRetry<T extends { error: { message?: string; status?: number } | null }>(
  fn: () => Promise<T>,
  attempts = 3
): Promise<T> {
  let last: T;
  for (let i = 0; i < attempts; i++) {
    last = await fn();
    const err = last.error;
    const isTransient =
      !!err &&
      (/network|fetch|522|failed to fetch/i.test(err.message || "") ||
        (err.status !== undefined && err.status >= 500));
    if (!err || !isTransient) return last;
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 500 * Math.pow(2, i))); // 500ms, 1s
  }
  return last!;
}

export async function signIn(
  email: string,
  password: string,
  rememberMe: boolean = false
): Promise<SignInResult> {
  // Store email for remember me
  if (rememberMe) {
    localStorage.setItem("ficium_remembered_email", email);
  } else {
    localStorage.removeItem("ficium_remembered_email");
  }

  const { data, error } = await withNetworkRetry(() =>
    supabase.auth.signInWithPassword({ email, password })
  );

  if (error) {
    await audit.loginFailed(error.message);
    return { ok: false, error: mapAuthError(error) };
  }

  if (!data.user) {
    return { ok: false, error: { code: "unknown", message: "Sign in did not return a user." } };
  }

  await audit.login();
  return { ok: true, userId: data.user.id };
}

/* ============================================================
   SIGN OUT
   ============================================================ */

export async function signOut(): Promise<void> {
  await audit.logout();
  await supabase.auth.signOut();
}

/* ============================================================
   CURRENT USER
   ============================================================ */

/**
 * Current user's id, read from the locally-cached session.
 *
 * Deliberately uses `getSession()` (local, zero network) rather than
 * `getUser()`, which issues a `GET /auth/v1/user` round-trip on EVERY call
 * to re-validate the JWT against the auth server.
 *
 * That validation is redundant for our use: the id is only ever used to
 * scope a query the database already enforces via RLS. A forged or expired
 * token cannot widen access — Postgres rejects it regardless of what this
 * returns. `autoRefreshToken` keeps the cached session fresh.
 *
 * Use `supabase.auth.getUser()` directly only when server-verified identity
 * is genuinely required (e.g. before a privileged, non-RLS-guarded action).
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

/* ============================================================
   ERROR MAPPING
   ============================================================ */

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
  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
    return { code: "invalid_credentials", message: "Incorrect email or password. Please try again." };
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return { code: "network", message: "Network error. Check your connection and try again." };
  }
  return { code: "unknown", message: err.message || "Something went wrong. Please try again." };
}