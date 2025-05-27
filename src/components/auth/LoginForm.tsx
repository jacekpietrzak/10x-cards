"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/schemas/auth";
import { FormInput } from "@/components/ui/FormInput";
import { FormButton } from "@/components/ui/FormButton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();

  const onSubmit = async (data: LoginInput) => {
    setFormError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!result.success) {
        setFormError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Zalogowano pomyślnie");
      router.push("/generate");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Coś poszło nie tak";
      setFormError(message);
      toast.error(message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zaloguj się</CardTitle>
      </CardHeader>
      <CardContent>
        {formError && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-4 p-4 bg-destructive/15 text-destructive rounded-md"
          >
            {formError}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <FormInput
            id="email"
            label="Email"
            type="email"
            {...register("email")}
            error={errors.email?.message?.toString()}
          />
          <FormInput
            id="password"
            label="Hasło"
            type="password"
            {...register("password")}
            error={errors.password?.message?.toString()}
          />
          <div className="flex justify-between items-center">
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Zapomniałeś hasła?
            </Link>
            <FormButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logowanie..." : "Zaloguj"}
            </FormButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
