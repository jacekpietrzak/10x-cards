import { createClient } from "@/utils/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Profil użytkownika</h1>

        <Card>
          <CardHeader>
            <CardTitle>Informacje podstawowe</CardTitle>
            <CardDescription>Twoje dane konta w 10xCards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Email
              </label>
              <p className="text-sm">{user.email}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Imię i nazwisko
              </label>
              <p className="text-sm">
                {user.user_metadata?.full_name || "Nie podano"}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Data rejestracji
              </label>
              <p className="text-sm">
                {new Date(user.created_at).toLocaleDateString("pl-PL")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
