"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, ResetPasswordInput } from "@/lib/schemas/auth";
import { FormInput } from "@/components/ui/FormInput";
import { FormButton } from "@/components/ui/FormButton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const accessToken = searchParams.get("access_token") || "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { accessToken },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    // TODO: Handle reset password submission
    console.log("Reset password data:", data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resetowanie hasła</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <FormInput
            id="newPassword"
            label="Nowe hasło"
            type="password"
            {...register("newPassword")}
            error={errors.newPassword?.message?.toString()}
          />
          <FormInput
            id="confirmPassword"
            label="Potwierdź nowe hasło"
            type="password"
            {...register("confirmPassword")}
            error={errors.confirmPassword?.message?.toString()}
          />
          <input type="hidden" {...register("accessToken")} />
          <FormButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Resetowanie..." : "Ustaw nowe hasło"}
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
