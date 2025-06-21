import { createClient } from '@supabase/supabase-js';
import { ChallengeFormData } from './validation';
import { Lab, LabQuestion } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const createChallenge = async (data: ChallengeFormData) => {
  try {
    // First create the challenge
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .insert({
        title: data.title,
        description: data.description,
        challenge_type: data.challenge_type,
        difficulty: data.difficulty,
        points: data.questions.reduce((sum, q) => sum + q.points, 0),
        status: 'pending',
        icon_url: data.icon_url || null, // Include icon_url in the insert
        short_description: data.short_description || null,
        scenario: data.scenario || null,
        learning_objectives: data.learning_objectives || null,
        tools_required: data.tools_required || null,
        prerequisites: data.prerequisites || null,
        target_audience: data.target_audience || null,
        estimated_time: data.estimated_time || 30,
        author_notes: data.author_notes || null,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (challengeError) throw challengeError;

    // Then create all questions
    const { error: questionsError } = await supabase
      .from('challenge_questions')
      .insert(
        data.questions.map((q, index) => ({
          challenge_id: challenge.id,
          question_number: index + 1,
          question: q.question,
          description: q.description || null,
          flag: q.flag,
          points: q.points,
          hints: q.hints || [],
          solution_explanation: q.solution_explanation || null,
          difficulty_rating: q.difficulty_rating || 3
        }))
      );

    if (questionsError) throw questionsError;

    return { success: true };
  } catch (error) {
    console.error('Error creating challenge:', error);
    return { success: false, error: 'Failed to create challenge' };
  }
};

export const loadChallenges = async () => {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select(`
        *,
        questions:challenge_questions(*)
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get user's completed challenges
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
      const { data: completions } = await supabase
        .from('challenge_completions')
        .select('challenge_id')
        .eq('user_id', user.id);

      // Mark completed challenges
      const completedIds = new Set(completions?.map(c => c.challenge_id) || []);
      const challengesWithCompletion = data?.map(challenge => ({
        ...challenge,
        completed: completedIds.has(challenge.id)
      }));

      return { success: true, data: challengesWithCompletion };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error loading challenges:', error);
    return { success: false, error: 'Failed to load challenges' };
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

    // Check if user has completed this challenge
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
      const { data: completion } = await supabase
        .from('challenge_completions')
        .select('*')
        .eq('challenge_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      return { 
        success: true, 
        data: {
          ...challenge,
          completed: !!completion
        }
      };
    }

    return { success: true, data: challenge };
  } catch (error) {
    console.error('Error loading challenge:', error);
    return { success: false, error: 'Failed to load challenge' };
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
            user_id: user.id
          });

        if (error && error.code !== '23505') { // Ignore unique constraint violation
          console.error('Error recording challenge completion:', error);
        }
      } catch (completionError) {
        console.error('Error recording challenge completion:', completionError);
        // Continue execution even if completion recording fails
      }

      // Add points
      try {
        await supabase
          .from('user_points')
          .insert({
            user_id: user.id,
            points: totalPoints,
            source_type: 'challenge',
            source_id: challengeId
          });
      } catch (pointsError) {
        console.error('Error adding points:', pointsError);
        // Continue execution even if points addition fails
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

export const submitChallengeAnswer = async (challengeId: string, questionId: string, answer: string) => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    // Get the question
    const { data: question, error: questionError } = await supabase
      .from('challenge_questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (questionError) throw questionError;

    // Check answer
    const isCorrect = answer.toLowerCase() === question.flag.toLowerCase();
    const pointsEarned = isCorrect ? question.points : 0;

    if (pointsEarned > 0) {
      try {
        // Add points
        await supabase
          .from('user_points')
          .insert({
            user_id: user.id,
            points: pointsEarned,
            source_type: 'challenge',
            source_id: questionId
          });
      } catch (pointsError) {
        console.error('Error adding points:', pointsError);
        // Continue execution even if points addition fails
      }
      
      try {
        // Check if all questions for this challenge are now answered correctly
        const { data: allQuestions } = await supabase
          .from('challenge_questions')
          .select('id')
          .eq('challenge_id', challengeId);
          
        const { data: userPoints } = await supabase
          .from('user_points')
          .select('source_id')
          .eq('user_id', user.id)
          .eq('source_type', 'challenge');
          
        const answeredQuestionIds = new Set(userPoints?.map(p => p.source_id) || []);
        const allQuestionsAnswered = allQuestions?.every(q => answeredQuestionIds.has(q.id));
        
        // If all questions are answered, mark the challenge as completed
        if (allQuestionsAnswered) {
          const { error } = await supabase
            .from('challenge_completions')
            .insert({
              challenge_id: challengeId,
              user_id: user.id
            });
            
          if (error && error.code !== '23505') { // Ignore unique constraint violation
            console.error('Error recording challenge completion:', error);
          }
        }
      } catch (completionError) {
        console.error('Error checking completion status:', completionError);
        // Continue execution even if completion check fails
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
    console.error('Error submitting answer:', error);
    return { success: false, error: 'Failed to submit answer' };
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