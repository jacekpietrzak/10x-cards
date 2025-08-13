import Link from "next/link";
import { BrainCircuit, Bot, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isFeatureEnabled } from "@/lib/features";

export default function Home() {
  const authEnabled = isFeatureEnabled("auth");

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 bg-gradient-to-b from-background to-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="flex flex-col items-center text-4xl lg:text-6xl font-bold tracking-tight mb-6">
              Create Flashcards 10x Faster
              <span className="text-primary"> with AI</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Transform any text into high-quality flashcards with artificial
              intelligence. Learn more effectively and save time.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {authEnabled && (
                <Button size="lg" asChild>
                  <Link href="/register">Get Started for Free</Link>
                </Button>
              )}
              <Button variant="outline" size="lg" asChild>
                <Link href="/#features">Learn More</Link>
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
              Features of 10xCards
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need for effective learning
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot size={24} className="text-primary" />
                  AI Generation
                </CardTitle>
                <CardDescription>
                  Automatic flashcard generation from any text
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Paste your text, and AI will create tailored flashcards for
                  you in seconds.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BrainCircuit size={24} className="text-primary" />
                  Spaced Repetition
                </CardTitle>
                <CardDescription>
                  FSRS algorithm for optimal learning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  The system automatically adjusts the review schedule to your
                  progress.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pencil size={24} className="text-primary" />
                  Personalization
                </CardTitle>
                <CardDescription>
                  Edit and customize flashcards to your needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Modify generated flashcards or create your own from scratch.
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
              Simple Pricing
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start for free, grow with us
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Free</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold">$0</span> / month
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li>✓ 50 flashcards per month</li>
                  <li>✓ AI generation</li>
                  <li>✓ Basic repetition algorithm</li>
                  <li>✓ Export to files</li>
                </ul>
                {authEnabled && (
                  <Button className="w-full" variant="outline" asChild>
                    <Link href="/register">Get Started</Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-2xl">Pro</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold">$7</span> / month
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li>✓ Unlimited flashcards</li>
                  <li>✓ Advanced AI models</li>
                  <li>✓ FSRS algorithm</li>
                  <li>✓ Statistics and analytics</li>
                  <li>✓ Priority support</li>
                </ul>
                {authEnabled && (
                  <Button className="w-full" asChild>
                    <Link href="/register">Try Pro</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              About 10xCards
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              We are a team of education and technology enthusiasts who believe
              that artificial intelligence can revolutionize the way we learn.
              Our mission is to make creating high-quality educational materials
              fast, easy, and accessible to everyone.
            </p>
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">10x</div>
                <div className="text-sm text-muted-foreground">
                  faster flashcard creation
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">98%</div>
                <div className="text-sm text-muted-foreground">
                  user satisfaction
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">50k+</div>
                <div className="text-sm text-muted-foreground">
                  flashcards generated
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
            Ready for 10x faster learning?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Join thousands of users who have already discovered the power of AI
            in learning.
          </p>
          {authEnabled && (
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register">Get Started Now</Link>
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
