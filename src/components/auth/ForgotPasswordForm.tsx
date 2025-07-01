"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, useState } from "react";
import { toast } from "sonner";

import { forgotPasswordSchema, ForgotPasswordInput } from "@/lib/schemas/auth";
import { sendPasswordReset } from "@/lib/actions/auth.actions";
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

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  function onSubmit(values: ForgotPasswordInput) {
    setError("");
    setIsSuccess(false);

    startTransition(async () => {
      try {
        const result = await sendPasswordReset(values);

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

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Forgot Password</CardTitle>
        <CardDescription>
          Enter your email and we will send you a link to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isSuccess ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">
                Reset instructions sent! Please check your email for further
                steps.
              </p>
            </div>
            <div className="text-sm">
              Didn&apos;t receive the email?{" "}
              <button
                onClick={() => {
                  setIsSuccess(false);
                  form.setValue("email", "");
                }}
                className="underline text-primary hover:text-primary/80"
                type="button"
              >
                Try again
              </button>
            </div>
            <div className="text-sm">
              Remembered your password?{" "}
              <Link href="/login" className="underline">
                Sign in
              </Link>
            </div>
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="m@example.com"
                          disabled={isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full cursor-pointer"
                  disabled={isPending}
                >
                  {isPending ? "Sending..." : "Send reset link"}
                </Button>
              </form>
            </Form>
            <div className="mt-4 text-center text-sm">
              Remembered your password?{" "}
              <Link href="/login" className="underline">
                Sign in
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
