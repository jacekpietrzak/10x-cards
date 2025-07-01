"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, useState } from "react";
import { toast } from "sonner";

import { resetPasswordSchema, ResetPasswordInput } from "@/lib/schemas/auth";
import { updatePassword } from "@/lib/actions/auth.actions";
import { isRedirectError } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/ui/FormError";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const accessToken = searchParams.get("access_token");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
      accessToken: accessToken || "",
    },
  });

  function onSubmit(values: ResetPasswordInput) {
    setError("");
    setIsSuccess(false);

    startTransition(async () => {
      try {
        const result = await updatePassword(values);

        if (result?.error) {
          setError(result.error);
          return;
        }

        if (result?.success) {
          setIsSuccess(true);
          toast.success(result.success);
          form.reset();
        }
      } catch (error) {
        // Next.js redirect() throws a special error that should be ignored
        if (isRedirectError(error)) {
          // This is a Next.js redirect, which is expected behavior
          return;
        }

        console.error("Password reset error:", error);
        setError("An unexpected error occurred. Please try again.");
      }
    });
  }

  if (!accessToken) {
    return (
      <Card className="mx-auto w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Invalid Link</CardTitle>
          <CardDescription>
            The password reset link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/forgot-password">
            <Button variant="outline" className="w-full">
              Request a new link
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Reset Password</CardTitle>
        <CardDescription>Enter your new password below.</CardDescription>
      </CardHeader>
      <CardContent>
        {isSuccess ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">
                Password updated successfully! You can now log in with your new
                password.
              </p>
            </div>
            <Link href="/login">
              <Button className="w-full">Continue to Login</Button>
            </Link>
          </div>
        ) : (
          <>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid gap-4"
              >
                {error && <FormError message={error} />}
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          disabled={isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          disabled={isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accessToken"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input type="hidden" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full cursor-pointer"
                  disabled={isPending}
                >
                  {isPending ? "Updating..." : "Set new password"}
                </Button>
              </form>
            </Form>
            <div className="mt-4 text-center text-sm">
              <Link href="/login" className="underline">
                Back to login
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
