"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";
import {
  ForgotPasswordInput,
  forgotPasswordSchema,
  LoginInput,
  loginSchema,
  RegisterInput,
  registerSchema,
  ResetPasswordInput,
  resetPasswordSchema,
} from "@/lib/schemas/auth";

export async function login(
  values: LoginInput,
  redirectTo: string | null = null,
) {
  const supabase = await createClient();

  const validatedFields = loginSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      error: "Invalid fields provided. Please try again.",
    };
  }

  const { email, password } = validatedFields.data;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: "Invalid login credentials. Please try again.",
    };
  }

  redirect(redirectTo || "/generate");
}

export async function register(values: RegisterInput) {
  const supabase = await createClient();

  const validatedFields = registerSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      error: "Invalid fields provided. Please check your input and try again.",
    };
  }

  const { email, password } = validatedFields.data;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    // Handle specific Supabase errors with more user-friendly messages
    if (error.message.includes("already registered")) {
      return {
        error:
          "An account with this email already exists. Please try logging in instead.",
      };
    }

    return {
      error: "Failed to create account. Please try again.",
    };
  }

  // If user is created and session exists (email confirmation disabled)
  if (data.user && data.session) {
    revalidatePath("/");
    redirect("/generate");
  }

  // If email confirmation is required (fallback)
  return {
    success:
      "Account created successfully! Please check your email to verify your account.",
  };
}

export async function logout() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      error: "Failed to sign out. Please try again.",
    };
  }

  revalidatePath("/");
  redirect("/");
}

export async function sendPasswordReset(values: ForgotPasswordInput) {
  const supabase = await createClient();

  const validatedFields = forgotPasswordSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      error: "Please provide a valid email address.",
    };
  }

  const { email } = validatedFields.data;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    }/reset-password`,
  });

  // Always return success message for security reasons
  // (don't reveal if email exists in database)
  if (error) {
    console.error("Password reset error:", error);
  }

  return {
    success:
      "If an account with that email exists, we've sent password reset instructions.",
  };
}

export async function updatePassword(values: ResetPasswordInput) {
  const supabase = await createClient();

  const validatedFields = resetPasswordSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      error: "Invalid password. Please check the requirements and try again.",
    };
  }

  const { newPassword } = validatedFields.data;

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    if (error.message.includes("session_not_found")) {
      return {
        error: "Password reset link has expired. Please request a new one.",
      };
    }

    return {
      error: "Failed to update password. Please try again.",
    };
  }

  revalidatePath("/");
  return {
    success:
      "Password updated successfully! You can now log in with your new password.",
  };
}
