import React, { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { isFeatureEnabled } from "@/lib/features";
import { redirect } from "next/navigation";

export default function ResetPasswordPage() {
  if (!isFeatureEnabled("auth")) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
