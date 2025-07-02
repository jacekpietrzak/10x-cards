"use client";

import React, { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
