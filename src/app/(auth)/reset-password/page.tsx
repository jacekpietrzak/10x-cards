"use client";

import React, { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Skeleton } from "@/components/ui/skeleton";

function ResetPasswordFormWrapper() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full max-w-md mx-auto" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

export default function ResetPasswordPage() {
  return <ResetPasswordFormWrapper />;
}
