"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();
  const isLoading = false;

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.error("Błąd podczas wylogowywania");
        return;
      }

      toast.success("Wylogowano pomyślnie");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Wystąpił nieoczekiwany błąd");
    }
  };

  return (
    <DropdownMenuItem>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        disabled={isLoading}
        className="w-full justify-start px-2"
      >
        {isLoading ? (
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
