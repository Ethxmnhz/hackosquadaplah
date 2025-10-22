// Use central Supabase client (avoid multiple instances that fragment auth state)
import { supabase } from './supabase';
import { ChallengeFormData } from './validation';
import { Lab, LabQuestion, SkillPath, SkillPathItem } from './types';

// Billing API helpers
// (Removed duplicate billing helper definitions added later in file)
// Simple plan helpers (user_plans table)
export async function getUserPlan() {
  const { data, error } = await supabase
    .from('user_plans')
    .select('plan, activated_at')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .maybeSingle();
  if (error) {
    console.warn('[getUserPlan] error (returning free):', error.message);
    return { plan: 'free' };
  }
  if (!data) return { plan: 'free' };
  return { plan: data.plan || 'free', activated_at: data.activated_at };
}

// Re-introduced lightweight entitlements fetch used by EntitlementsList component
// Returns active + inactive entitlements for current user (scopes from content_entitlements join if needed later)
export async function getEntitlements() {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return [];
    // user_content_purchases OR content_entitlements gated scopes? For now assume table user_content_purchases for ownership
    // But original component expects: id, scope, active, ends_at (generic). We'll derive a synthetic scope when not present.
    const { data, error } = await supabase
      .from('user_content_purchases')
      .select('id, content_type, content_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('[getEntitlements] fallback empty:', error.message);
      return [];
    }
    return (data || []).map(r => ({
      id: r.id,
      scope: `${r.content_type}:${r.content_id}`,
      active: true,
      ends_at: null
    }));
  } catch (e) {
    console.error('[getEntitlements] exception', e);
    return [];
  }
}

// Call edge function to create or verify payment
export async function payPlan(action: 'create'|'verify', payload: any) {
  // Use Supabase functions client so it routes correctly in dev & prod
  try {
    const { data, error } = await supabase.functions.invoke('pay-plan', {
      body: { action, ...payload }
    });
    if (error) {
      // Log full error for diagnostics
      console.error('[payPlan] invoke error', {
        message: error.message,
        name: (error as any).name,
        status: (error as any).status,
        stack: (error as any).stack
      });
      throw new Error(error.message || 'Payment error');
    }
    if (!data) {
      console.warn('[payPlan] No data returned from function');
    }
    return data as any;
  } catch (e:any) {
    console.error('[payPlan] exception', e);
    throw e;
  }
}

export const createChallenge = async (data: ChallengeFormData) => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    // Calculate total points from all task questions
    const totalPoints = data.tasks?.reduce((sum, task) => 
      sum + task.questions.reduce((qSum, q) => qSum + q.points, 0), 0
    ) || data.questions?.reduce((sum, q) => sum + q.points, 0) || 0;

    // First create the challenge with enhanced structure
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .insert({
        title: data.title,
        description: data.description,
        challenge_type: data.challenge_type,
        difficulty: data.difficulty,
        points: totalPoints,
        status: data.status || 'pending',
        icon_url: data.icon_url || null,
        short_description: data.short_description || data.description?.substring(0, 200) || null,
        scenario: data.scenario || null,
        learning_objectives: data.learning_objectives || null,
        tools_required: data.tools_required || null,
        prerequisites: data.prerequisites || null,
        target_audience: data.target_audience || null,
        estimated_time: data.estimated_time || 30,
        author_notes: `${data.author_notes || ''}${data.lab_environment ? `\n\n=== LAB ENVIRONMENT ===\n${JSON.stringify(data.lab_environment)}` : ''}${data.tasks ? `\n\n=== ENHANCED TASKS STRUCTURE ===\n${JSON.stringify(data.tasks)}` : ''}`,
        created_by: user.id
      })
      .select()
      .single();

    if (challengeError) throw challengeError;

    // Create backward compatible questions if provided
    if (data.questions && data.questions.length > 0) {
      const { error: questionsError } = await supabase
        .from('challenge_questions')
        .insert(
          data.questions.map((q, index) => ({
            challenge_id: challenge.id,
            question_number: index + 1,
            question: q.question,
            description: q.description || null,
            flag: q.flag,
            points: Math.min(Math.max(Math.round(q.points / 10), 1), 5), // Convert to 1-5 scale for database
            hints: q.hints || [],
            solution_explanation: q.solution_explanation || null,
            difficulty_rating: Math.min(Math.max(q.difficulty_rating || 3, 1), 5) // Ensure rating is 1-5
          }))
        );

      if (questionsError) throw questionsError;
    }

    return { success: true, data: challenge };
  } catch (error) {
    console.error('Error creating challenge:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create challenge' };
  }
};

export const submitChallengeAnswer = async (challengeId: string, questionId: string, answer: string) => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    console.log('=== ANSWER SUBMISSION START ===');
    console.log('Submitting answer for:', { challengeId, questionId, answer });

    // Get the challenge to check if it uses enhanced tasks structure
    const { data: challenge } = await supabase
      .from('challenges')
      .select('author_notes')
      .eq('id', challengeId)
      .single();

    let isEnhancedTask = false;
    let taskQuestion = null;
    let enhancedTasks = null;

    // Check if this is an enhanced task question
    if (challenge?.author_notes?.includes('=== ENHANCED TASKS STRUCTURE ===') && questionId.includes('-')) {
      isEnhancedTask = true;
      console.log('✓ Detected enhanced task question');
      
      try {
        const tasksSection = challenge.author_notes.split('=== ENHANCED TASKS STRUCTURE ===')[1];
        if (tasksSection) {
          enhancedTasks = JSON.parse(tasksSection.trim());
          console.log('✓ Parsed enhanced tasks:', enhancedTasks);
          
          // Find the question in the enhanced structure
          for (const task of enhancedTasks) {
            const question = task.questions?.find((q: any) => q.id === questionId);
            if (question) {
              taskQuestion = {
                ...question,
                task_title: task.title
              };
              console.log('✓ Found task question:', taskQuestion);
              break;
            }
          }
        }
      } catch (parseError) {
        console.error('✗ Failed to parse enhanced tasks:', parseError);
        isEnhancedTask = false;
      }
    }

    if (isEnhancedTask && taskQuestion) {
      console.log('Processing enhanced task question:', taskQuestion);
      
      // Get all questions in order from the enhanced structure first
      const allQuestions = enhancedTasks?.flatMap((task: any) =>
        task.questions?.map((q: any) => q.id) || []
      ) || [];
      console.log('📋 All questions in order:', allQuestions);

      // Find the index of the current question
      const questionIndex = allQuestions.indexOf(questionId);
      console.log(`📍 Question "${questionId}" is at index:`, questionIndex);
      
      if (questionIndex === -1) {
        console.error('✗ Question not found in challenge structure');
        throw new Error('Question not found in challenge structure');
      }

      // Check existing answers for this challenge
      const { data: existingAnswers, error: fetchError } = await supabase
        .from('user_points')
        .select('id, points, created_at')
        .eq('user_id', user.id)
        .eq('source_type', 'challenge')
        .eq('source_id', challengeId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('✗ Error fetching existing answers:', fetchError);
        throw fetchError;
      }

      console.log('📊 Existing answers for challenge:', existingAnswers);

      // Clean up duplicates and check if already answered
      let cleanedAnswers = existingAnswers || [];
      const maxAnswers = allQuestions.length;
      
      if (cleanedAnswers.length > maxAnswers) {
        console.log('🧹 Cleaning up duplicate entries...');
        const duplicates = cleanedAnswers.slice(maxAnswers);
        
        for (const duplicate of duplicates) {
          await supabase
            .from('user_points')
            .delete()
            .eq('id', duplicate.id);
        }
        
        cleanedAnswers = cleanedAnswers.slice(0, maxAnswers);
        console.log('✅ After cleanup, remaining answers:', cleanedAnswers.length);
      }

      // Check if this specific question has already been answered
      const alreadyAnswered = cleanedAnswers.length > questionIndex;
      
      if (alreadyAnswered) {
        console.log('⚠️ Question already answered');
        
        // Return with current progress info for UI update
        const answeredQuestionIds = allQuestions.slice(0, cleanedAnswers.length);
        return {
          success: true,
          data: {
            isCorrect: true,
            pointsEarned: 0,
            alreadyAnswered: true,
            progress: {
              answered: cleanedAnswers.length,
              total: allQuestions.length,
              answeredQuestions: new Set(answeredQuestionIds)
            }
          }
        };
      }

      // Check if user is trying to answer questions out of order
      const expectedNextIndex = cleanedAnswers.length;
      if (questionIndex !== expectedNextIndex) {
        console.log('⚠️ Question answered out of order:', { questionIndex, expectedNextIndex });
        return {
          success: false,
          error: `Please answer questions in order. Expected question at index ${expectedNextIndex}`
        };
      }

      // Check if the answer is correct
  const isCorrect = answer.trim().toLowerCase() === taskQuestion.expected_answer.trim().toLowerCase();
      
      const pointsEarned = isCorrect ? taskQuestion.points : 0;
      console.log('✅ Answer check:', { 
        isCorrect, 
        pointsEarned, 
        expected: taskQuestion.expected_answer, 
        provided: answer,
        caseSensitive: taskQuestion.case_sensitive 
      });

      if (pointsEarned > 0) {
        try {
          console.log('💾 Inserting points into database...');
          
          // Insert points using the challenge ID as source_id
          const { data: insertResult, error: insertError } = await supabase
            .from('user_points')
            .insert({
              user_id: user.id,
              points: pointsEarned,
              source_type: 'challenge',
              source_id: challengeId,
              earned_at: new Date().toISOString()
            })
            .select();

          if (insertError) {
            console.error('✗ Insert error:', insertError);
            throw insertError;
          }

          console.log('✅ Points inserted successfully:', insertResult);

          // Update user stats
          try {
            await supabase.rpc('update_user_stats_manual', { target_user_id: user.id });
          } catch (rpcError) {
            console.warn('⚠️ RPC update failed:', rpcError);
          }

          // Calculate updated progress
          const newAnsweredCount = cleanedAnswers.length + 1;
          const answeredQuestionIds = allQuestions.slice(0, newAnsweredCount);
          
          console.log('🏁 Progress check:', { 
            newAnsweredCount, 
            totalQuestions: allQuestions.length,
            answeredQuestionIds 
          });

          // Check if all questions are now answered
          const allAnswered = newAnsweredCount >= allQuestions.length;
          if (allAnswered) {
            console.log('🎉 All questions answered! Marking challenge as completed...');
            
            const totalPointsFromStructure = enhancedTasks?.reduce((sum: number, task: any) =>
              sum + task.questions.reduce((qSum: number, q: any) => qSum + q.points, 0), 0
            ) || 0;

            await supabase
              .from('challenge_completions')
              .insert({
                challenge_id: challengeId,
                user_id: user.id,
                points_earned: totalPointsFromStructure,
                completed_at: new Date().toISOString()
              });

            console.log('✅ Challenge marked as completed');

            // Also mark this challenge as completed in any skill paths that include it
            try {
              await markAllPathsContainingItemAsCompleted('challenge', challengeId, totalPointsFromStructure);
            } catch (spErr) {
              console.warn('Failed to update skill path progress for challenge completion:', spErr);
            }
          }

          console.log('=== ANSWER SUBMISSION END ===');
          
          // Return success with updated progress data for UI
          return {
            success: true,
            data: {
              isCorrect,
              pointsEarned,
              alreadyAnswered: false,
              progress: {
                answered: newAnsweredCount,
                total: allQuestions.length,
                answeredQuestions: new Set(answeredQuestionIds),
                completed: allAnswered
              }
            }
          };
        } catch (pointsError) {
          console.error('✗ Error adding points:', pointsError);
          throw pointsError;
        }
      } else {
        console.log('❌ Answer was incorrect, no points awarded');
        
        // Return with current progress for UI (no change in progress)
        const answeredQuestionIds = allQuestions.slice(0, cleanedAnswers.length);
        return {
          success: true,
          data: {
            isCorrect: false,
            pointsEarned: 0,
            alreadyAnswered: false,
            progress: {
              answered: cleanedAnswers.length,
              total: allQuestions.length,
              answeredQuestions: new Set(answeredQuestionIds),
              completed: false
            }
          }
        };
      }
    } else {
      // Handle legacy challenge questions with existing logic
      console.log('Processing legacy challenge question...');
      
      // Get the question from challenge_questions table
      const { data: question, error: questionError } = await supabase
        .from('challenge_questions')
        .select('*')
        .eq('id', questionId)
        .single();

      if (questionError) throw questionError;

      // Check if answer is correct
  const isCorrect = answer.trim().toLowerCase() === question.flag.trim().toLowerCase();

      const pointsEarned = isCorrect ? question.points : 0;

      if (pointsEarned > 0) {
        // Add points for correct answer
        await supabase
          .from('user_points')
          .insert({
            user_id: user.id,
            points: pointsEarned,
            source_type: 'challenge', 
            source_id: questionId,
            earned_at: new Date().toISOString()
          });

        // Update user stats
        try {
          await supabase.rpc('update_user_stats_manual', { target_user_id: user.id });
        } catch (rpcError) {
          console.warn('⚠️ RPC update failed:', rpcError);
        }
      }
      
      return {
        success: true,
        data: {
          isCorrect,
          pointsEarned,
          alreadyAnswered: false
        }
      };
    }
  } catch (error) {
    console.error('✗ Error submitting answer:', error);
    return { success: false, error: `Failed to submit answer: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

export const getChallenge = async (id: string) => {
  try {
    const { data: challenge, error } = await supabase
      .from('challenges')
      .select(`
        *,
        questions:challenge_questions(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Parse lab environment from author_notes if available
    let labEnvironment = { enabled: false };
    if (challenge.author_notes?.includes('=== LAB ENVIRONMENT ===')) {
      try {
        const labSection = challenge.author_notes.split('=== LAB ENVIRONMENT ===')[1]?.split('=== ENHANCED TASKS STRUCTURE ===')[0];
        if (labSection) {
          labEnvironment = JSON.parse(labSection.trim());
        }
      } catch (parseError) {
        console.warn('Failed to parse lab environment from author_notes:', parseError);
      }
    }

    // Parse enhanced tasks structure from author_notes if available
    let enhancedTasks = null;
    let isEnhancedChallenge = false;
    if (challenge.author_notes?.includes('=== ENHANCED TASKS STRUCTURE ===')) {
      try {
        const tasksSection = challenge.author_notes.split('=== ENHANCED TASKS STRUCTURE ===')[1];
        if (tasksSection) {
          enhancedTasks = JSON.parse(tasksSection.trim());
          isEnhancedChallenge = true;
        }
      } catch (parseError) {
        console.warn('Failed to parse enhanced tasks from author_notes:', parseError);
      }
    }

    let enhancedChallenge = { 
      ...challenge,
      lab_environment: labEnvironment
    };
    
    if (enhancedTasks && Array.isArray(enhancedTasks) && enhancedTasks.length > 0) {
      // Use enhanced tasks structure from stored data
      enhancedChallenge.tasks = enhancedTasks.map((task, taskIndex) => ({
        ...task,
        id: task.id || `task-${taskIndex}`,
  questions: task.questions?.map((q: any, qIndex: number) => ({
          ...q,
          id: q.id || `${task.id || taskIndex}-${qIndex}`
        })) || []
      }));
    } else if (challenge.questions && challenge.questions.length > 0) {
      // Convert old questions format to tasks format
      enhancedChallenge.tasks = [{
        id: 'legacy-task-1',
        title: 'Challenge Questions',
        description: 'Complete all questions to finish this challenge',
        explanation: challenge.description || '',
  questions: challenge.questions.map((q: any) => ({
          id: q.id,
          question_text: q.question,
          expected_answer: q.flag,
          answer_validation: 'exact',
          case_sensitive: false,
          points: q.points,
          hints: (q.hints || []).map((hint: any) => ({ text: hint, unlock_after_attempts: 2 })),
          question_type: 'text' as const,
          solution_explanation: q.solution_explanation
        })),
        attachments: []
      }];
    } else {
      // No questions or tasks found
      enhancedChallenge.tasks = [];
    }

    // Check if user has completed this challenge and get answered questions
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
      const { data: completion } = await supabase
        .from('challenge_completions')
        .select('*')
        .eq('challenge_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      let answeredQuestions = new Set<string>();

      if (isEnhancedChallenge) {
        console.log('=== PROGRESS TRACKING START ===');
        
        // Get all question IDs in order FIRST
        const allQuestionIds = enhancedChallenge.tasks?.flatMap((task: any) =>
          task.questions?.map((q: any) => q.id) || []
        ) || [];
        console.log('📋 All question IDs in order:', allQuestionIds);
        
        // For enhanced challenges, get user points for this challenge and count them
        const { data: userAnswers } = await supabase
          .from('user_points')
          .select('id, points, created_at')
          .eq('user_id', user.id)
          .eq('source_type', 'challenge')
          .eq('source_id', id)
          .order('created_at', { ascending: true });

        console.log('📊 User answers from database:', userAnswers);

        // Clean up duplicates if they exist
        const maxAnswers = allQuestionIds.length;
        let cleanedAnswers = userAnswers || [];
        
        if (cleanedAnswers.length > maxAnswers) {
          console.log('🧹 Found duplicate entries, cleaning up...');
          const duplicates = cleanedAnswers.slice(maxAnswers);
          
          // Delete duplicates
          for (const duplicate of duplicates) {
            await supabase
              .from('user_points')
              .delete()
              .eq('id', duplicate.id);
          }
          
          cleanedAnswers = cleanedAnswers.slice(0, maxAnswers);
          console.log('✅ Duplicates cleaned, remaining answers:', cleanedAnswers.length);
        }

        // Mark the first N questions as answered, where N is the number of points entries
        const answeredCount = Math.min(cleanedAnswers.length, maxAnswers);
        console.log('📊 Questions answered count (after cleanup):', answeredCount);
        
        const answeredQuestionsList = allQuestionIds.slice(0, answeredCount);
        answeredQuestions = new Set(answeredQuestionsList);

        console.log('✅ Enhanced challenge progress calculated:', { 
          answeredCount, 
          totalQuestions: allQuestionIds.length, 
          answeredQuestions: Array.from(answeredQuestions),
          progress: `${answeredCount}/${allQuestionIds.length}`
        });
        console.log('=== PROGRESS TRACKING END ===');
      } else {
        // For legacy challenges, get user points with challenge source type
        const { data: userAnswers } = await supabase
          .from('user_points')
          .select('source_id, points, earned_at')
          .eq('user_id', user.id)
          .eq('source_type', 'challenge');

        // Filter answers that belong to this challenge's questions
        const allQuestionIds = enhancedChallenge.tasks?.flatMap((task: any) =>
          task.questions?.map((q: any) => q.id) || []
        ) || [];
        
        answeredQuestions = new Set(
          userAnswers?.filter(a => allQuestionIds.includes(a.source_id))?.map(a => a.source_id) || []
        );
      }

      return { 
        success: true, 
        data: {
          ...enhancedChallenge,
          completed: !!completion,
          completion_data: completion,
          answered_questions: answeredQuestions,
          is_enhanced_challenge: isEnhancedChallenge
        }
      };
    }

    return { success: true, data: { ...enhancedChallenge, is_enhanced_challenge: isEnhancedChallenge } };
  } catch (error) {
    console.error('Error loading challenge:', error);
    return { success: false, error: 'Failed to load challenge' };
  }
};

// --- Billing Helpers (provider-agnostic placeholders) ---
// REMOVED billing helpers (billingCheckout, getEntitlements, redeemVoucher, getCatalog, getSubscriptions, createSubscription, cancelSubscription, getPurchases)
// If any code still imports these, remove those imports/usages.

// (Continue with next existing exports below after removed section)

export const loadChallenges = async () => {
  try {
    let data: any[] | null = null;
    let error: any = null;
    // Attempt full expanded query first
    const full = await supabase
      .from('challenges')
      .select(`*, questions:challenge_questions(*)`)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    data = full.data as any[] | null;
    error = full.error;

    // Fallback: if error (500 likely) or no data, try minimal columns then fetch questions separately per challenge
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[loadChallenges] full query failed, attempting fallback minimal query', error.message);
      const minimal = await supabase
        .from('challenges')
        .select('id,title,created_at,status')
        .eq('status','approved')
        .order('created_at', { ascending: false });
      if (!minimal.error && minimal.data) {
        // Fetch questions per challenge in parallel (batched)
        const ids = minimal.data.map(c => c.id);
        let questionsByChallenge: Record<string, any[]> = {};
        if (ids.length) {
          const qRes = await supabase.from('challenge_questions').select('*').in('challenge_id', ids);
          if (!qRes.error && qRes.data) {
            for (const q of qRes.data) {
              (questionsByChallenge[q.challenge_id] = questionsByChallenge[q.challenge_id] || []).push(q);
            }
          }
        }
        data = minimal.data.map(c => ({ ...c, questions: questionsByChallenge[c.id] || [] }));
        error = null; // recovered
      }
    }
    if (error) throw error;

    // Process challenges to ensure they have proper task structure
    const processedChallenges = data?.map(challenge => {
      let enhancedChallenge = { ...challenge };
      
      if (challenge.tasks && Array.isArray(challenge.tasks) && challenge.tasks.length > 0) {
        // Already has enhanced tasks structure
        enhancedChallenge.tasks = challenge.tasks;
      } else if (challenge.questions && challenge.questions.length > 0) {
        // Convert old questions format to tasks format for display
        enhancedChallenge.tasks = [{
          id: 'legacy-task-1',
          title: 'Challenge Questions',
          description: 'Complete all questions to finish this challenge',
          questions: challenge.questions.map((q: any) => ({
            id: q.id,
            question_text: q.question,
            expected_answer: q.flag,
            points: q.points
          }))
        }];
      } else {
        enhancedChallenge.tasks = [];
      }

      return enhancedChallenge;
    }) || [];

    // Get user's completed challenges
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
      const { data: completions } = await supabase
        .from('challenge_completions')
        .select('challenge_id, completed_at, points_earned')
        .eq('user_id', user.id);

      // Mark completed challenges
      const completedIds = new Set(completions?.map(c => c.challenge_id) || []);
      const challengesWithCompletion = processedChallenges.map(challenge => ({
        ...challenge,
        completed: completedIds.has(challenge.id),
        completion_data: completions?.find(c => c.challenge_id === challenge.id)
      }));

      return { success: true, data: challengesWithCompletion };
    }

    return { success: true, data: processedChallenges };
  } catch (error) {
    console.error('Error loading challenges:', error);
    return { success: false, error: 'Failed to load challenges' };
  }
};

export const submitChallenge = async (challengeId: string, answers: Record<string, string>) => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    // Get challenge questions and check answers
    const { data: questions } = await supabase
      .from('challenge_questions')
      .select('*')
      .eq('challenge_id', challengeId);

    if (!questions) throw new Error('Challenge questions not found');

    // Calculate score
    let correctAnswers = 0;
    let totalPoints = 0;

    questions.forEach(question => {
      if (answers[question.id]?.toLowerCase() === question.flag.toLowerCase()) {
        correctAnswers++;
        totalPoints += question.points;
      }
    });

    // Record completion if at least one answer is correct
    if (correctAnswers > 0) {
      try {
        const { error } = await supabase
          .from('challenge_completions')
          .insert({
            challenge_id: challengeId,
            user_id: user.id,
            points_earned: totalPoints,
            completed_at: new Date().toISOString()
          });

        if (error && error.code !== '23505') { // Ignore unique constraint violation
          console.error('Error recording challenge completion:', error);
        }
      } catch (completionError) {
        console.error('Error recording challenge completion:', completionError);
        // Continue execution even if completion recording fails
      }

      // Reflect completion into any skill paths that contain this challenge
      try {
        await markAllPathsContainingItemAsCompleted('challenge', challengeId, totalPoints);
      } catch (spErr) {
        console.warn('Failed to update skill path progress for challenge submission:', spErr);
      }

      // Add points for each correct answer
      for (const question of questions) {
        if (answers[question.id]?.toLowerCase() === question.flag.toLowerCase()) {
          try {
            await supabase
              .from('user_points')
              .insert({
                user_id: user.id,
                points: question.points,
                source_type: 'challenge',
                source_id: question.id,
                earned_at: new Date().toISOString()
              });
          } catch (pointsError) {
            console.error('Error adding points:', pointsError);
            // Continue execution even if points addition fails
          }
        }
      }

      // Update user stats manually to avoid trigger issues
      try {
        await supabase.rpc('update_user_stats_manual', { target_user_id: user.id });
      } catch (statsError) {
        console.warn('Error updating user stats:', statsError);
        // Continue execution even if stats update fails
      }
    }

    return { 
      success: true, 
      data: {
        correctAnswers,
        total: questions.length,
        score: totalPoints
      }
    };
  } catch (error) {
    console.error('Error submitting challenge:', error);
    return { success: false, error: 'Failed to submit challenge' };
  }
};

export const createLab = async (lab: Partial<Lab>, questions: Partial<LabQuestion>[], tags: string[]) => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    // Calculate total points from questions
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

    // Create the lab
    const { data: newLab, error: labError } = await supabase
      .from('labs')
      .insert({
        title: lab.title,
        description: lab.description || '',
        category: lab.category,
        difficulty: lab.difficulty,
        points: totalPoints,
        estimated_time: lab.estimated_time,
        short_intro: lab.short_intro,
        learning_objectives: lab.learning_objectives || [],
        attack_scenario: lab.attack_scenario,
        lab_type: lab.lab_type,
        docker_command: lab.docker_command,
        vm_download_url: lab.vm_download_url,
        external_link: lab.external_link,
        setup_instructions: lab.setup_instructions,
        thumbnail_url: lab.thumbnail_url,
        suggested_tools: lab.suggested_tools || [],
        pre_reading_links: lab.pre_reading_links || [],
        created_by: user.id,
        status: 'draft'
      })
      .select()
      .single();

    if (labError) throw labError;

    // Create questions
    if (questions.length > 0) {
      const { error: questionsError } = await supabase
        .from('lab_questions')
        .insert(
          questions.map((q, index) => ({
            lab_id: newLab.id,
            question_number: index + 1,
            question: q.question,
            description: q.description,
            answer: q.answer,
            points: q.points,
            question_type: q.question_type,
            hints: q.hints || [],
            options: q.options || [],
            code_template: q.code_template
          }))
        );

      if (questionsError) throw questionsError;
    }

    // Add tags
    if (tags.length > 0) {
      const { error: tagsError } = await supabase
        .from('lab_tags')
        .insert(
          tags.map(tagId => ({
            lab_id: newLab.id,
            tag_id: tagId
          }))
        );

      if (tagsError) throw tagsError;
    }

    return { success: true, data: newLab };
  } catch (error) {
    console.error('Error creating lab:', error);
    return { success: false, error: 'Failed to create lab' };
  }
};

export const getLabs = async () => {
  try {
    const { data, error } = await supabase
      .from('labs')
      .select(`
        *,
        tags:lab_tags(
          tag:tags(*)
        )
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get user's completed labs
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
      const { data: completions } = await supabase
        .from('lab_completions')
        .select('*')
        .eq('user_id', user.id);

      // Process completions
      const labsWithCompletion = data?.map(lab => {
        const completion = completions?.find(c => c.lab_id === lab.id);
        return {
          ...lab,
          completed: !!completion,
          points_earned: completion?.points_earned || 0
        };
      });

      return { success: true, data: labsWithCompletion };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error loading labs:', error);
    return { success: false, error: 'Failed to load labs' };
  }
};

export const getLab = async (id: string) => {
  try {
    const { data: lab, error } = await supabase
      .from('labs')
      .select(`
        *,
        questions:lab_questions(*),
        tags:lab_tags(
          tag:tags(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Check if user has completed this lab
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
      const { data: completion } = await supabase
        .from('lab_completions')
        .select('*')
        .eq('lab_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      return {
        success: true,
        data: {
          ...lab,
          completed: !!completion,
          points_earned: completion?.points_earned || 0
        }
      };
    }

    return { success: true, data: lab };
  } catch (error) {
    console.error('Error loading lab:', error);
    return { success: false, error: 'Failed to load lab' };
  }
};

export const submitLabAnswer = async (labId: string, questionId: string, answer: string) => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    // Get the question
    const { data: question, error: questionError } = await supabase
      .from('lab_questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (questionError) throw questionError;

    // Check answer
    const isCorrect = answer.toLowerCase() === question.answer.toLowerCase();
    const pointsEarned = isCorrect ? question.points : 0;

    if (pointsEarned > 0) {
      try {
        // Add points
        await supabase
          .from('user_points')
          .insert({
            user_id: user.id,
            points: pointsEarned,
            source_type: 'lab',
            source_id: labId
          });

        // Update user stats manually to avoid trigger issues
        await supabase.rpc('update_user_stats_manual', { target_user_id: user.id });
      } catch (error) {
        console.error('Error adding points:', error);
        // Continue execution even if points addition fails
      }
    }

    return {
      success: true,
      data: {
        isCorrect,
        pointsEarned
      }
    };
  } catch (error) {
    console.error('Error submitting lab answer:', error);
    return { success: false, error: 'Failed to submit answer' };
  }
};

export const submitLabAnswers = async (labId: string, answers: Record<string, string>) => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    // Get lab questions and check answers
    const { data: questions } = await supabase
      .from('lab_questions')
      .select('*')
      .eq('lab_id', labId);

    if (!questions) throw new Error('Lab questions not found');

    // Calculate score
    let correctAnswers = 0;
    let totalPoints = 0;

    questions.forEach(question => {
      if (answers[question.id]?.toLowerCase() === question.answer.toLowerCase()) {
        correctAnswers++;
        totalPoints += question.points;
      }
    });

    // Record completion if at least one answer is correct
    if (correctAnswers > 0) {
      try {
        const { error } = await supabase
          .from('lab_completions')
          .insert({
            lab_id: labId,
            user_id: user.id,
            points_earned: totalPoints
          });

        if (error && error.code !== '23505') { // Ignore unique constraint violation
          console.error('Error recording lab completion:', error);
        }
      } catch (error) {
        console.error('Error recording lab completion:', error);
        // Continue execution even if completion recording fails
      }

      // Reflect completion into any skill paths that contain this lab
      try {
        await markAllPathsContainingItemAsCompleted('lab', labId, totalPoints);
      } catch (spErr) {
        console.warn('Failed to update skill path progress for lab submission:', spErr);
      }

      // Add points
      try {
        await supabase
          .from('user_points')
          .insert({
            user_id: user.id,
            points: totalPoints,
            source_type: 'lab',
            source_id: labId
          });

        // Update user stats manually to avoid trigger issues
        await supabase.rpc('update_user_stats_manual', { target_user_id: user.id });
      } catch (error) {
        console.error('Error adding points:', error);
        // Continue execution even if points addition fails
      }
    }

    return {
      success: true,
      data: {
        correctAnswers,
        total: questions.length,
        points_earned: totalPoints
      }
    };
  } catch (error) {
    console.error('Error submitting lab answers:', error);
    return { success: false, error: 'Failed to submit lab answers' };
  }
};

export const joinLab = async (labId: string) => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    // Get lab details
    const { data: lab } = await supabase
      .from('labs')
      .select('estimated_time')
      .eq('id', labId)
      .single();

    if (!lab) throw new Error('Lab not found');

    // Join lab
    const { data, error } = await supabase
      .from('lab_participants')
      .insert({
        lab_id: labId,
        user_id: user.id,
        time_remaining: lab.estimated_time * 60 // Convert minutes to seconds
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error joining lab:', error);
    return { success: false, error: 'Failed to join lab' };
  }
};

export const updateLabTime = async (labId: string, timeRemaining: number) => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('lab_participants')
      .update({ time_remaining: timeRemaining })
      .eq('lab_id', labId)
      .eq('user_id', user.id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error updating lab time:', error);
    return { success: false, error: 'Failed to update lab time' };
  }
};

// Skill Paths API
export const getSkillPaths = async (options?: {
  published_only?: boolean;
  category?: string;
  difficulty?: string;
  limit?: number;
  offset?: number;
}) => {
  try {
    let query = supabase
      .from('skill_paths')
      .select(`
        id, title, description, short_description, difficulty, estimated_duration, total_points, category, prerequisites, learning_objectives, cover_image, is_published, created_at, updated_at, created_by,
        code, icon_url, certificate_image_url, exam_type, exam_duration_minutes, passing_score_percent, max_attempts, cooldown_hours_between_attempts, validity_period_days, recommended_experience, delivery_mode, certificate_title_override, certificate_subtitle, issuer_name, issuer_signature_url, metadata_json, is_featured, tags,
        skill_path_items(*)
      `);

    if (options?.published_only) {
      query = query.eq('is_published', true);
    }
    if (options?.category) {
      query = query.eq('category', options.category);
    }
    if (options?.difficulty) {
      query = query.eq('difficulty', options.difficulty);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    
    // Manually fetch challenges and labs for each skill path
    const skillPathsWithItems = await Promise.all(
      (data || []).map(async (skillPath) => {
        const pathItems = skillPath.skill_path_items || [];
        
        // Fetch challenges and labs separately
        const itemsWithContent = await Promise.all(
          pathItems.map(async (item) => {
            let content = null;
            
            if (item.item_type === 'challenge') {
              const { data: challenge } = await supabase
                .from('challenges')
                .select('*')
                .eq('id', item.item_id)
                .single();
              content = { challenge };
            } else if (item.item_type === 'lab') {
              const { data: lab } = await supabase
                .from('labs')
                .select('*')
                .eq('id', item.item_id)
                .single();
              content = { lab };
            }
            
            return { ...item, ...content };
          })
        );
        
        return {
          ...skillPath,
          path_items: itemsWithContent
        };
      })
    );

    // Get user progress if authenticated
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
      const { data: progressData } = await supabase
        .from('skill_path_progress')
        .select('*')
        .eq('user_id', user.id);

      const skillPathsWithProgress = skillPathsWithItems.map(skillPath => {
          const progress = progressData?.find(p => p.skill_path_id === skillPath.id);
          return {
            ...skillPath,
            // Return a single object (or undefined) to match types instead of wrapping in array
            user_progress: progress || undefined,
            enrolled_count: 0 // TODO: Add actual enrolled count
          };
        });

      return { success: true, data: skillPathsWithProgress };
    }

    return { success: true, data: skillPathsWithItems.map(sp => ({ ...sp, enrolled_count: 0 })) };
  } catch (error) {
    console.error('Error fetching skill paths:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch skill paths' };
  }
};

export const getSkillPath = async (id: string) => {
  try {
    const { data: skillPath, error } = await supabase
      .from('skill_paths')
      .select(`
        id, title, description, short_description, difficulty, estimated_duration, total_points, category, prerequisites, learning_objectives, cover_image, is_published, created_at, updated_at, created_by,
        code, icon_url, certificate_image_url, exam_type, exam_duration_minutes, passing_score_percent, max_attempts, cooldown_hours_between_attempts, validity_period_days, recommended_experience, delivery_mode, certificate_title_override, certificate_subtitle, issuer_name, issuer_signature_url, metadata_json, is_featured, tags,
        skill_path_items(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Manually fetch challenges and labs for the skill path
    const pathItems = skillPath.skill_path_items || [];

    const itemsWithContent = await Promise.all(
      pathItems.map(async (item: any) => {
        try {
          let content: any = {};
          if (item.item_type === 'challenge') {
            const { data: challenge } = await supabase
              .from('challenges')
              .select('*')
              .eq('id', item.item_id)
              .maybeSingle();
            if (challenge) content.challenge = challenge;
          } else if (item.item_type === 'lab') {
            const { data: lab } = await supabase
              .from('labs')
              .select('*')
              .eq('id', item.item_id)
              .maybeSingle();
            if (lab) content.lab = lab;
          }
          return { ...item, ...content };
        } catch {
          return item; // Fail soft on individual content fetch
        }
      })
    );

    // Get user progress if authenticated; tolerate no row (406) as 'not enrolled'
    const user = (await supabase.auth.getUser()).data.user;
    let userProgress: any = undefined;
    let itemProgress: any[] = [];

    if (user) {
      try {
        const { data: progress, error: progressError } = await supabase
          .from('skill_path_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('skill_path_id', id)
          .maybeSingle();
        if (!progressError && progress) userProgress = progress;
      } catch (progressErr: any) {
        // Ignore 406 (no row) other errors bubble
        if (progressErr?.status && progressErr.status !== 406) {
          console.warn('Progress fetch error (non-critical):', progressErr);
        }
      }
      try {
        const { data: itemProgressData } = await supabase
          .from('skill_path_item_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('skill_path_id', id);
        itemProgress = itemProgressData || [];
      } catch (ipErr) {
        console.warn('Item progress fetch error (non-critical):', ipErr);
      }
    }

    const transformedData = {
      ...skillPath,
      path_items: itemsWithContent,
      user_progress: userProgress ? { ...userProgress, item_progress: itemProgress } : undefined
    };

    return { success: true, data: transformedData };
  } catch (error) {
    console.error('Error fetching skill path:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch skill path' };
  }
};

export const createSkillPath = async (skillPath: Partial<SkillPath>) => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('skill_paths')
      .insert([{
        ...skillPath,
        tags: (skillPath as any).tags || [],
        created_by: user.user.id
      }])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating skill path:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create skill path' };
  }
};

export const createSkillPathItems = async (skillPathId: string, items: Partial<SkillPathItem>[]) => {
  try {
    const { data, error } = await supabase
      .from('skill_path_items')
      .insert(items.map(item => ({
        skill_path_id: skillPathId,
        item_type: item.item_type,
        item_id: item.item_id,
        order_index: item.order_index,
        is_required: item.is_required || true,
        unlock_after: item.unlock_after || []
      })));

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating skill path items:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create skill path items' };
  }
};

export const updateSkillPath = async (id: string, skillPath: Partial<SkillPath>) => {
  try {
    const updatePayload: any = { ...skillPath };
    if ((skillPath as any).tags) updatePayload.tags = (skillPath as any).tags;

    const { data, error } = await supabase
      .from('skill_paths')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating skill path:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update skill path' };
  }
};

export const deleteSkillPath = async (id: string) => {
  try {
    const { error } = await supabase
      .from('skill_paths')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting skill path:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete skill path' };
  }
};

export const enrollInSkillPath = async (skillPathId: string) => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('skill_path_progress')
      .insert({
        user_id: user.user.id,
        skill_path_id: skillPathId,
          status: 'enrolled',
          progress_percentage: 0,
          enrolled_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error enrolling in skill path:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to enroll in skill path' };
  }
};

// Ensure there's a progress row for the current user and given skill path
export const ensureSkillPathEnrollment = async (skillPathId: string) => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  // Try get existing
  const { data: existing } = await supabase
    .from('skill_path_progress')
    .select('*')
    .eq('user_id', user.user.id)
    .eq('skill_path_id', skillPathId)
    .maybeSingle();

  if (existing) return existing;

  // Otherwise enroll
  const enroll = await enrollInSkillPath(skillPathId);
  if (!enroll.success) throw new Error(enroll.error || 'Failed to enroll');
  return enroll.data;
};

// Recompute aggregate progress for a skill path (completed items, points, percentage, status)
export const recomputeSkillPathProgress = async (skillPathId: string) => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    // Ensure we have a progress row
    await ensureSkillPathEnrollment(skillPathId);

    // Fetch path items (need both path item id and content id)
    const { data: pathItems, error: itemsErr } = await supabase
      .from('skill_path_items')
      .select('id, item_id, item_type, is_required, order_index')
      .eq('skill_path_id', skillPathId)
      .order('order_index', { ascending: true });
    if (itemsErr) throw itemsErr;

    const totalItems = (pathItems || []).length;

    // Fetch item progress rows
    const { data: itemProgress, error: ipErr } = await supabase
      .from('skill_path_item_progress')
      .select('item_id, points_earned, completed_at')
      .eq('user_id', user.user.id)
      .eq('skill_path_id', skillPathId);
    if (ipErr) throw ipErr;

    // Build sets and aggregates
    const progressByContentId = new Map<string, { points_earned: number; completed: boolean }>();
    (itemProgress || []).forEach(row => {
      progressByContentId.set(String(row.item_id), {
        points_earned: row.points_earned || 0,
        completed: !!row.completed_at
      });
    });

    const completedPathItemIds: string[] = [];
    let totalPoints = 0;

    (pathItems || []).forEach(pi => {
      const p = progressByContentId.get(String(pi.item_id));
      if (p?.completed) {
        completedPathItemIds.push(String(pi.id));
        totalPoints += p.points_earned || 0;
      }
    });

    const progressPct = totalItems > 0 ? (completedPathItemIds.length / totalItems) * 100 : 0;
    const status = progressPct >= 100 ? 'completed' : (progressPct > 0 ? 'in_progress' : 'enrolled');

    // Determine next current item (first not completed by path order)
    const nextItem = (pathItems || []).find(pi => !completedPathItemIds.includes(String(pi.id)));
    const current_item_id = nextItem ? nextItem.id : null;

    // Update aggregate row
    const { data: updated, error: updErr } = await supabase
      .from('skill_path_progress')
      .update({
        completed_items: completedPathItemIds,
        total_points_earned: totalPoints,
        progress_percentage: Math.round(progressPct * 100) / 100,
        status,
        current_item_id
      })
      .eq('user_id', user.user.id)
      .eq('skill_path_id', skillPathId)
      .select()
      .maybeSingle();
    if (updErr) throw updErr;

    return { success: true, data: updated };
  } catch (error) {
    console.error('Error recomputing skill path progress:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to recompute progress' };
  }
};

// Mark a specific item as completed within a skill path, upserting item progress and recomputing aggregate progress
export const markSkillPathItemCompleted = async (
  skillPathId: string,
  itemId: string, // content id (challenge or lab id)
  itemType: 'challenge' | 'lab',
  pointsEarned: number = 0
) => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    await ensureSkillPathEnrollment(skillPathId);

    // Upsert item progress for this item
    const { error: upsertErr } = await supabase
      .from('skill_path_item_progress')
      .upsert({
        user_id: user.user.id,
        skill_path_id: skillPathId,
        item_id: itemId,
        item_type: itemType,
        completed_at: new Date().toISOString(),
        points_earned: pointsEarned,
        attempts: 1
      }, { onConflict: 'user_id,skill_path_id,item_id' });
    if (upsertErr) throw upsertErr;

    // Recompute aggregate
    return await recomputeSkillPathProgress(skillPathId);
  } catch (error) {
    console.error('Error marking skill path item completed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update item completion' };
  }
};

// Helper: find all skill paths that include the given item and mark completion in each
export const markAllPathsContainingItemAsCompleted = async (
  itemType: 'challenge' | 'lab',
  itemId: string,
  pointsEarned: number = 0
) => {
  try {
    // Find all skill_path_ids that contain this item
    const { data: containers, error: findErr } = await supabase
      .from('skill_path_items')
      .select('skill_path_id')
      .eq('item_type', itemType)
      .eq('item_id', itemId);
    if (findErr) throw findErr;

    const uniquePathIds = Array.from(new Set((containers || []).map(c => c.skill_path_id))).filter(Boolean) as string[];
    for (const pathId of uniquePathIds) {
      await markSkillPathItemCompleted(pathId, itemId, itemType, pointsEarned);
    }
    return { success: true, data: { updated_paths: uniquePathIds.length } };
  } catch (error) {
    console.error('Error marking item completed across all skill paths:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to mark item in skill paths' };
  }
};