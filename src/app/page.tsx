import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 bg-gradient-to-b from-background to-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">
              Twórz fiszki 10x szybciej
              <span className="text-primary"> z AI</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Przekształć dowolny tekst w wysokiej jakości fiszki dzięki
              sztucznej inteligencji. Ucz się efektywniej i oszczędzaj czas.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/register">Zacznij za darmo</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/#features">Dowiedz się więcej</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Funkcje 10xCards
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Wszystko czego potrzebujesz do efektywnej nauki
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>🤖 AI Generation</CardTitle>
                <CardDescription>
                  Automatyczne generowanie fiszek z dowolnego tekstu
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Wklej tekst, a AI stworzy dla Ciebie dopasowane fiszki w
                  sekundach.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🧠 Spaced Repetition</CardTitle>
                <CardDescription>
                  Algorytm FSRS dla optymalnej nauki
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  System automatycznie dostosowuje harmonogram powtórek do
                  Twoich postępów.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>✏️ Personalizacja</CardTitle>
                <CardDescription>
                  Edytuj i dostosowuj fiszki do siebie
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Modyfikuj wygenerowane fiszki lub twórz własne od podstaw.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Prosty cennik
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Rozpocznij za darmo, rozwijaj się razem z nami
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Darmowy</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold">0 zł</span> / miesiąc
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li>✓ 50 fiszek miesięcznie</li>
                  <li>✓ AI generowanie</li>
                  <li>✓ Podstawowy algorytm powtórek</li>
                  <li>✓ Export do plików</li>
                </ul>
                <Button className="w-full" variant="outline" asChild>
                  <Link href="/register">Rozpocznij za darmo</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-2xl">Pro</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold">29 zł</span> / miesiąc
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li>✓ Nieograniczone fiszki</li>
                  <li>✓ Zaawansowane AI modele</li>
                  <li>✓ FSRS algorytm</li>
                  <li>✓ Statystyki i analityki</li>
                  <li>✓ Priorytetowy support</li>
                </ul>
                <Button className="w-full" asChild>
                  <Link href="/register">Wypróbuj Pro</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">O 10xCards</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Jesteśmy zespołem pasjonatów edukacji i technologii, którzy
              wierzą, że sztuczna inteligencja może rewolucjonizować sposób, w
              jaki się uczymy. Nasza misja to sprawienie, aby tworzenie wysokiej
              jakości materiałów edukacyjnych było szybkie, łatwe i dostępne dla
              każdego.
            </p>
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">10x</div>
                <div className="text-sm text-muted-foreground">
                  szybsze tworzenie fiszek
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">98%</div>
                <div className="text-sm text-muted-foreground">
                  zadowoleni użytkownicy
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">50k+</div>
                <div className="text-sm text-muted-foreground">
                  wygenerowanych fiszek
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-6">
            Gotowy na 10x szybszą naukę?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Dołącz do tysięcy użytkowników, którzy już odkryli moc AI w nauce
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/register">Zacznij już teraz</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
