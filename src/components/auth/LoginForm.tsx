"use client";

import React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/schemas/auth";
import { FormInput } from "@/components/ui/FormInput";
import { FormButton } from "@/components/ui/FormButton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    // TODO: Handle login submission
    console.log("Login data:", data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zaloguj się</CardTitle>
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
