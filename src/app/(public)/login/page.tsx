import React, { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { isFeatureEnabled } from "@/lib/features";
import { redirect } from "next/navigation";

export default function LoginPage() {
  if (!isFeatureEnabled("auth")) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
