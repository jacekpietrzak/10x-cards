"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

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
    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
      Wyloguj się
    </DropdownMenuItem>
  );
}
