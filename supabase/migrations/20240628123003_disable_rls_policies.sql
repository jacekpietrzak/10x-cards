-- Disable policies for the generations table
DROP POLICY IF EXISTS "Users can view their own generations" ON public.generations;
DROP POLICY IF EXISTS "Users can create their own generations" ON public.generations;
DROP POLICY IF EXISTS "Users can update their own generations" ON public.generations;
DROP POLICY IF EXISTS "Users can delete their own generations" ON public.generations;
-- Disable policies for the flashcards table
DROP POLICY IF EXISTS "Users can view their own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Users can create their own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Users can update their own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Users can delete their own flashcards" ON public.flashcards;
-- Disable policies for the generation_error_logs table
DROP POLICY IF EXISTS "Users can view their own error logs" ON public.generation_error_logs;
DROP POLICY IF EXISTS "Users can create their own error logs" ON public.generation_error_logs;