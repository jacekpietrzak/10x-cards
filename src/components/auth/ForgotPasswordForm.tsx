"use client";

import React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, ForgotPasswordInput } from "@/lib/schemas/auth";
import { FormInput } from "@/components/ui/FormInput";
import { FormButton } from "@/components/ui/FormButton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function ForgotPasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    // TODO: Handle forgot password submission
    console.log("Forgot password data:", data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Odzyskiwanie hasła</CardTitle>
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
          <FormButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Wysyłanie..." : "Wyślij link resetujący"}
          </FormButton>
          <p className="text-sm text-center">
            <Link href="/login" className="text-primary hover:underline">
              Powrót do logowania
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
