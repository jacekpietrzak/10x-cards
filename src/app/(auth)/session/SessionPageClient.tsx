"use client";

import { useReviewSession } from "@/hooks/useReviewSession";
import { SessionView } from "@/components/session/SessionView";
import { NoCardsToReview } from "@/components/session/NoCardsToReview";
import { SessionSummary } from "@/components/session/SessionSummary";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SessionPageClient() {
  const { state, currentCard, showAnswer, rateCard, startSession } =
    useReviewSession();

  // Loading state
  if (state.sessionState === "loading") {
    return (
      <div className="container mx-auto max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Loading study session...</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (state.sessionState === "error") {
    return (
      <div className="container mx-auto max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Error loading session</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {state.error ||
                "An unexpected error occurred. Try refreshing the page."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Refresh page
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No cards to review
  if (state.sessionState === "empty") {
    return <NoCardsToReview />;
  }

  // Session finished
  if (state.sessionState === "finished") {
    return (
      <SessionSummary
        reviewedCount={state.reviewedCount}
        onStartAgain={startSession}
      />
    );
  }

  // Active session
  if (state.sessionState === "active" && currentCard) {
    return (
      <SessionView
        card={currentCard}
        isAnswerVisible={state.isAnswerVisible}
        onShowAnswer={showAnswer}
        onRate={rateCard}
        progress={{
          current: state.currentCardIndex + 1,
          total: state.cardsToReview.length,
        }}
        isSubmittingReview={state.isSubmittingReview}
      />
    );
  }

  return null;
}
