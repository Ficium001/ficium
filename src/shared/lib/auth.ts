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
};

export async function signUpIndividual(input: SignUpIndividualInput): Promise<SignUpResult> {
  const { email, password, firstName, middleName, lastName, phone, title, country } = input;
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
        role: "client",
        user_type: "individual",
        country,
      },
    },
  });

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

  const { data, error } = await supabase.auth.signUp({
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
  });

  if (error) return { ok: false, error: mapAuthError(error) };
  if (!data.user) return { ok: false, error: { code: "unknown", message: "Sign up did not return a user." } };

  await audit.login();
  return { ok: true, userId: data.user.id, needsEmailConfirmation: !data.session };
}


/* ============================================================
   SIGN IN
   ============================================================ */

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

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

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

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
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
  if (msg.includes("network") || msg.includes("fetch")) {
    return { code: "network", message: "Network error. Check your connection and try again." };
  }
  return { code: "unknown", message: err.message || "Something went wrong. Please try again." };
}