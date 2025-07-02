-- Enable RLS for all relevant tables
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_error_logs ENABLE ROW LEVEL SECURITY;
-- Policies for 'generations' table
DROP POLICY IF EXISTS "Users can view their own generations" ON public.generations;
CREATE POLICY "Users can view their own generations" ON public.generations FOR
SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own generations" ON public.generations;
CREATE POLICY "Users can create their own generations" ON public.generations FOR
INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own generations" ON public.generations;
CREATE POLICY "Users can update their own generations" ON public.generations FOR
UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own generations" ON public.generations;
CREATE POLICY "Users can delete their own generations" ON public.generations FOR DELETE USING (auth.uid() = user_id);
-- Policies for 'flashcards' table
DROP POLICY IF EXISTS "Users can view their own flashcards" ON public.flashcards;
CREATE POLICY "Users can view their own flashcards" ON public.flashcards FOR
SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own flashcards" ON public.flashcards;
CREATE POLICY "Users can create their own flashcards" ON public.flashcards FOR
INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own flashcards" ON public.flashcards;
CREATE POLICY "Users can update their own flashcards" ON public.flashcards FOR
UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own flashcards" ON public.flashcards;
CREATE POLICY "Users can delete their own flashcards" ON public.flashcards FOR DELETE USING (auth.uid() = user_id);
-- Policies for 'generation_error_logs' table
DROP POLICY IF EXISTS "Users can view their own error logs" ON public.generation_error_logs;
CREATE POLICY "Users can view their own error logs" ON public.generation_error_logs FOR
SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own error logs" ON public.generation_error_logs;
CREATE POLICY "Users can create their own error logs" ON public.generation_error_logs FOR
INSERT WITH CHECK (auth.uid() = user_id);