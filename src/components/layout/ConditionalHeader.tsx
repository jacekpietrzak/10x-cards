import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { PublicHeader } from "./PublicHeader";
import { MainHeader } from "./MainHeader";
import { HybridHeader } from "./HybridHeader";

export async function ConditionalHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Jeśli użytkownik nie jest zalogowany, renderuj nawigację publiczną
  if (!user) {
    return <PublicHeader />;
  }

  // Sprawdź czy użytkownik jest na stronie głównej
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "/";

  // Jeśli zalogowany użytkownik jest na stronie głównej, użyj hybrydowego headera
  if (pathname === "/") {
    return <HybridHeader user={user} />;
  }

  // W pozostałych przypadkach użyj standardowej nawigacji prywatnej
  return <MainHeader />;
}
