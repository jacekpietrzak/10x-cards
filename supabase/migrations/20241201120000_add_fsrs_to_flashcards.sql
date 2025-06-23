-- Add FSRS (Free Spaced Repetition Scheduler) columns to flashcards table
-- These columns support the spaced repetition algorithm
-- Add FSRS columns (all nullable to support gradual migration)
alter table public.flashcards
add column stability real,
    add column difficulty real,
    add column due timestamptz,
    add column lapses integer,
    add column state integer,
    add column last_review timestamptz;
-- Create index on due date for efficient querying of cards due for review
create index flashcards_due_idx on public.flashcards(due)
where due is not null;
-- Create index on state for efficient filtering
create index flashcards_state_idx on public.flashcards(state)
where state is not null;
-- Comments for documentation
comment on column public.flashcards.stability is 'FSRS stability parameter - measures how stable the memory of this card is';
comment on column public.flashcards.difficulty is 'FSRS difficulty parameter - measures how difficult this card is for the user';
comment on column public.flashcards.due is 'Next review date calculated by FSRS algorithm';
comment on column public.flashcards.lapses is 'Number of times the card was forgotten/failed';
comment on column public.flashcards.state is 'FSRS card state: 0=new, 1=learning, 2=review, 3=relearning';
comment on column public.flashcards.last_review is 'Timestamp of the last review session for this card';