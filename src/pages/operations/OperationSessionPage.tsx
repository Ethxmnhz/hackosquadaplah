import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

// Create a page to handle redirections to the appropriate lab interface
const OperationSessionPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSessionAndRedirect = async () => {
      if (!sessionId || !user) {
        setError('Missing session ID or user not authenticated');
        setLoading(false);
        return;
      }

      try {
        // Get the session details
        const { data: session, error: sessionError } = await supabase
          .from('lab_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionError) {
          throw new Error(`Session not found: ${sessionError.message}`);
        }

        if (!session) {
          throw new Error('Session not found');
        }

        console.log('Found session:', session);

        // Determine the user's team
        let team: 'red' | 'blue' = 'red'; // Default to red
        
        if (session.red_user_id === user.id) {
          team = 'red';
        } else if (session.blue_user_id === user.id) {
          team = 'blue';
        } else {
          throw new Error('You are not a participant in this session');
        }

        // Check if the URL already has a team parameter
        const urlParams = new URLSearchParams(location.search);
        const urlTeam = location.pathname.endsWith('/red') ? 'red' : 
                        location.pathname.endsWith('/blue') ? 'blue' : null;
        
        // If there's a team in the URL path that doesn't match the user's team, show an error
        if (urlTeam && urlTeam !== team) {
          console.warn(`URL team (${urlTeam}) doesn't match user's team (${team})`);
          // Continue anyway but log the warning
        }

        // Extract lab ID from the URL or the session
        const labId = urlParams.get('lab') || session.lab_id;

        if (!labId) {
          throw new Error('Lab ID not found in session or URL');
        }

        // Redirect to the lab interface page with the correct parameters
        navigate(`/red-vs-blue/lab/${labId}?session=${sessionId}&team=${team}`, { replace: true });
      } catch (error: any) {
        console.error('Error loading session:', error);
        setError(error.message || 'Error loading session');
        setLoading(false);
      }
    };

    loadSessionAndRedirect();
  }, [sessionId, user, navigate, location]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-t-2 border-b-2 border-primary rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-white">Loading Session...</h2>
          <p className="text-white/60">Please wait while we prepare your operation.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="max-w-md p-8 bg-background-light rounded-xl shadow-lg border border-red-500/30">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Session Error</h2>
          <p className="text-white/80 mb-6">{error}</p>
          <button
            onClick={() => navigate('/operations/arena')}
            className="btn-primary px-4 py-2 rounded-lg w-full"
          >
            Return to Arena
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="animate-spin h-12 w-12 border-t-2 border-b-2 border-primary rounded-full mx-auto mb-4"></div>
        <h2 className="text-xl font-bold text-white">Redirecting...</h2>
        <p className="text-white/60">Preparing your operation interface.</p>
      </div>
    </div>
  );
};

export default OperationSessionPage;
