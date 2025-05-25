"use client";

import React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterInput } from "@/lib/schemas/auth";
import { FormInput } from "@/components/ui/FormInput";
import { FormButton } from "@/components/ui/FormButton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function RegisterForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    // TODO: Handle registration submission
    console.log("Register data:", data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rejestracja</CardTitle>
      </CardHeader>
      <CardContent>
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
          <FormInput
            id="confirmPassword"
            label="Potwierdź hasło"
            type="password"
            {...register("confirmPassword")}
            error={errors.confirmPassword?.message?.toString()}
          />
          <FormButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Rejestracja..." : "Zarejestruj"}
          </FormButton>
          <p className="text-sm text-center">
            Masz już konto?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Zaloguj się
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
