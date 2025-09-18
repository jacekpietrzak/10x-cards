import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function NoCardsToReview() {
  return (
    <div className="container mx-auto max-w-4xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Great job!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground text-lg">
            No flashcards to review today.
            <br />
            Come back tomorrow to continue learning!
          </p>
          <div className="pt-4">
            <Button asChild>
              <Link href="/flashcards">Go to my flashcards</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
