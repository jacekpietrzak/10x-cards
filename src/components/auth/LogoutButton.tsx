"use client";

import { useTransition } from "react";
import { logout } from "@/lib/actions/auth.actions";
import { isRedirectError } from "@/lib/utils";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut } from "lucide-react";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      try {
        const result = await logout();

        if (result?.error) {
          toast.error(result.error);
          return;
        }

        // Success case - redirect will be handled by the server action
        toast.success("Signed out successfully");
      } catch (error) {
        // Next.js redirect() throws a special error that should be ignored
        if (isRedirectError(error)) {
          // This is a Next.js redirect, which is expected behavior
          return;
        }

        console.error("Logout error:", error);
        toast.error("An unexpected error occurred");
      }
    });
  };

  return (
    <DropdownMenuItem>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        disabled={isPending}
        className="w-full justify-start px-2"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing out...
          </>
        ) : (
          <>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </>
        )}
      </Button>
    </DropdownMenuItem>
  );
}
