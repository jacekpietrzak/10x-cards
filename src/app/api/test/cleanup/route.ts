import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * API endpoint for test data cleanup
 * Only works in test environment and for the authenticated user
 */
export async function DELETE() {
  // Only allow in test environment
  if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Cleanup endpoint only available in test/development environment' },
      { status: 403 }
    );
  }
  
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Only allow cleanup for test user
    const testUserId = process.env.TEST_USER_ID;
    if (testUserId && user.id !== testUserId) {
      return NextResponse.json(
        { error: 'Cleanup only allowed for test user' },
        { status: 403 }
      );
    }
    
    console.log(`🧹 Cleaning up test data for user: ${user.email} (${user.id})`);
    
    const results = {
      flashcards: 0,
      generations: 0,
      errorLogs: 0,
      errors: [] as string[]
    };
    
    // Delete flashcards
    const { data: flashcards, error: flashcardsError } = await supabase
      .from('flashcards')
      .delete()
      .eq('user_id', user.id)
      .select('id');
    
    if (flashcardsError) {
      results.errors.push(`Flashcards: ${flashcardsError.message}`);
    } else {
      results.flashcards = flashcards?.length || 0;
    }
    
    // Delete generations
    const { data: generations, error: generationsError } = await supabase
      .from('generations')
      .delete()
      .eq('user_id', user.id)
      .select('id');
    
    if (generationsError) {
      results.errors.push(`Generations: ${generationsError.message}`);
    } else {
      results.generations = generations?.length || 0;
    }
    
    // Delete error logs
    const { data: errorLogs, error: errorLogsError } = await supabase
      .from('generation_error_logs')
      .delete()
      .eq('user_id', user.id)
      .select('id');
    
    if (errorLogsError) {
      results.errors.push(`Error logs: ${errorLogsError.message}`);
    } else {
      results.errorLogs = errorLogs?.length || 0;
    }
    
    return NextResponse.json({
      success: results.errors.length === 0,
      deleted: {
        flashcards: results.flashcards,
        generations: results.generations,
        errorLogs: results.errorLogs
      },
      errors: results.errors
    });
    
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error during cleanup' },
      { status: 500 }
    );
  }
}