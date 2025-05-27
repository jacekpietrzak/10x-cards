import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Authentication - 10xCards",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full p-4">
        <div className="flex justify-center mb-6">
          <Link href="/" className="text-2xl font-bold">
            10xCards
          </Link>
        </div>
        {children}
      </div>
    </main>
  );
}
