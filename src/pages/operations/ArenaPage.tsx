import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Zap, Flame, Users, UserPlus, UserCheck, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useOperations } from '../../hooks/useOperations';
import { supabase } from '../../lib/supabase';

// Define types for our components
interface OperationRequest {
  id: string;
  user_id: string;
  username?: string;
  team: 'Red' | 'Blue';
  lab_id: string;
  status: 'waiting' | 'invited' | 'matched' | 'rejected';
  created_at: string;
  partner_id?: string;
  partner_username?: string;
  session_id?: string;
}

interface UserCardProps {
  request: OperationRequest;
  onInvite: (request: OperationRequest) => void;
}

const ArenaPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { 
    availableLabs, 
    pendingRequests, 
    createOperationRequest, 
    sendInvite, 
    acceptInvite,
    declineInvite,
    loadArenaRequests
  } = useOperations();

  const [selectedTeam, setSelectedTeam] = useState<'Red' | 'Blue' | ''>('');
  const [selectedLab, setSelectedLab] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [invitingUser, setInvitingUser] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteDeclined, setInviteDeclined] = useState(false);
  const [pendingInvite, setPendingInvite] = useState<OperationRequest | null>(null);
  const [sentInviteDeclined, setSentInviteDeclined] = useState(false);

  // Extract team preference from URL if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const team = params.get('team');
    if (team && (team === 'Red' || team === 'Blue')) {
      setSelectedTeam(team);
    }
    
    const labId = params.get('labId');
    if (labId) {
      setSelectedLab(labId);
    }

    // Initial load of requests
    loadArenaRequests();
    
    // Set up interval for periodic refreshes
    const interval = setInterval(() => {
      loadArenaRequests();
    }, 5000); // Refresh every 5 seconds

    // Set up real-time subscription for session creation and match requests
    let subscription: any = null;
    
    if (user?.id) {
      subscription = supabase
        .channel('arena-updates-' + user.id)
        // Listen for new lab sessions where this user is RED team
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'lab_sessions',
            filter: `red_user_id=eq.${user.id}` 
          }, 
          (payload: { new: { id: string, lab_id: string } }) => {
            const session = payload.new;
            // Redirect directly to the lab page (bypassing the session page redirect)
            console.log('Detected new lab session as RED team:', session);
            navigate(`/red-vs-blue/lab/${session.lab_id}?session=${session.id}&team=red`);
          }
        )
        // Listen for new lab sessions where this user is BLUE team
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'lab_sessions',
            filter: `blue_user_id=eq.${user.id}` 
          }, 
          (payload: { new: { id: string, lab_id: string } }) => {
            const session = payload.new;
            // Redirect directly to the lab page (bypassing the session page redirect)
            console.log('Detected new lab session as BLUE team:', session);
            navigate(`/red-vs-blue/lab/${session.lab_id}?session=${session.id}&team=blue`);
          }
        )
        // Listen for match request updates where this user is the PARTNER (received an invite)
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'match_requests',
            filter: `partner_id=eq.${user.id}`
          },
          () => {
            loadArenaRequests();
          }
        )
        // Listen for match request updates where this user is the REQUESTER (sent an invite)
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'match_requests',
            filter: `user_id=eq.${user.id}`
          },
          (payload: any) => {
            // Check if this update is a declined invitation
            if (payload.new && payload.new.status === 'declined') {
              setSentInviteDeclined(true);
              setTimeout(() => setSentInviteDeclined(false), 3000);
              
              // Play notification sound if supported
              try {
                const audio = new Audio('/notification.mp3');
                audio.volume = 0.5;
                audio.play().catch(() => {});
              } catch (error) {
                // Silent fail for notification errors
              }
            }
            
            loadArenaRequests();
          }
        )
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [location, loadArenaRequests, navigate, user]);

  // Check if the user has any pending invites
  useEffect(() => {
    if (user && pendingRequests) {
      // Type assertion to tell TypeScript these are our custom OperationRequest type
      const typedRequests = pendingRequests as unknown as OperationRequest[];
      
      console.log('Checking for invitations. User ID:', user.id);
      
      // Look for invites where the current user is the partner (recipient)
      // First, prioritize official 'invited' status
      let invite = typedRequests.find(req => {
        const isInvitedAsPartner = req.status === 'invited' && req.partner_id === user.id;
        return isInvitedAsPartner;
      });
      
      // FALLBACK 1: Look for any request where user is listed as partner, even if status isn't 'invited'
      if (!invite) {
        const partnerRequests = typedRequests.filter(req => 
          req.partner_id === user.id && 
          req.status !== 'matched' && 
          req.status !== 'rejected'
        );
        
        if (partnerRequests.length > 0) {
          console.log('Found requests with user as partner:', partnerRequests);
          
          // Sort by created_at descending to get the most recent ones first
          const sortedPartnerRequests = partnerRequests.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          // Prioritize 'waiting' status since that might mean the status update failed
          const waitingPartnerRequest = sortedPartnerRequests.find(req => req.status === 'waiting');
          if (waitingPartnerRequest) {
            console.log('Found waiting request with user as partner:', waitingPartnerRequest);
            invite = waitingPartnerRequest;
          } else if (sortedPartnerRequests.length > 0) {
            console.log('Using most recent partner request as fallback:', sortedPartnerRequests[0]);
            invite = sortedPartnerRequests[0];
          }
        }
      }
      
      // FALLBACK 2: Try to manually check for any recent request that might be an invite
      // This helps in case the partner_id field is missing but other data suggests it's an invite
      if (!invite) {
        const recentRequests = typedRequests
          .filter(req => 
            req.status !== 'matched' && 
            req.status !== 'rejected' && 
            req.user_id !== user.id
          )
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        // If we find a very recent request (last 5 minutes), consider it might be an invite
        const veryRecentRequest = recentRequests.find(req => {
          const requestTime = new Date(req.created_at).getTime();
          const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
          return requestTime > fiveMinutesAgo;
        });
        
        if (veryRecentRequest) {
          console.log('No direct invite found, but found very recent request:', veryRecentRequest);
          invite = veryRecentRequest;
        }
      }
      
      console.log('Final invite determination:', invite);
      
      // If we found an invite and didn't have one before, play a notification sound
      if (invite && !pendingInvite) {
        try {
          // Create a subtle notification sound
          const audio = new Audio('/notification.mp3');
          audio.volume = 0.5;
          audio.play().catch(() => {});
          
          // Also show a browser notification if supported
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Arena Invite', {
              body: `${invite.username || 'Someone'} has invited you to join a ${invite.team === 'Red' ? 'Blue' : 'Red'} Team operation.`,
              icon: '/favicon.png'
            });
          }
        } catch (error) {
          // Silent fail for notification errors
        }
      }
      
      if (invite) {
        setPendingInvite(invite);
      } else {
        setPendingInvite(null);
      }
    }
  }, [user, pendingRequests, pendingInvite]);

  // Filters for displaying users by team preference
  // Type assertion to handle the type mismatch
  const typedRequests = pendingRequests as unknown as OperationRequest[];
  
  // Find active sessions for this user
  const userActiveSessions = typedRequests.filter(req => {
    const isMatchedStatus = req.status === 'matched';
    const isUserInvolved = req.user_id === user?.id || req.partner_id === user?.id;
    const hasSessionId = !!req.session_id;
    return isMatchedStatus && isUserInvolved && hasSessionId;
  });
  
  // Check if user has active sessions
  const hasActiveSessions = userActiveSessions.length > 0;

  // Handle direct entry to a session
  const handleEnterSession = async (sessionId: string, labId: string) => {
    if (!sessionId || !labId) return;
    
    try {
      // Get the session details
      const { data: session, error: sessionError } = await supabase
        .from('lab_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
        
      if (sessionError || !session) {
        throw new Error(sessionError?.message || 'Session not found');
      }
      
      // Determine the user's team
      let team = 'blue'; // Default
      if (user && session.red_user_id === user.id) {
        team = 'red';
      } else if (user && session.blue_user_id === user.id) {
        team = 'blue';
      }
      
      // Navigate to the lab interface
      navigate(`/red-vs-blue/lab/${labId}?session=${sessionId}&team=${team}`);
    } catch (error: any) {
      console.error('Error entering session:', error);
      alert(`Failed to enter session: ${error.message || 'Unknown error'}`);
    }
  };
  
  const redTeamUsers = typedRequests.filter(req => {
    // Basic criteria: Must be Red team and in waiting status
    const isRedTeam = req.team === 'Red';
    const isWaiting = req.status === 'waiting';
    const isNotCurrentUser = req.user_id !== user?.id;
    
    // Should include this user if they meet the criteria
    return isRedTeam && isWaiting && isNotCurrentUser;
  });
  
  const blueTeamUsers = typedRequests.filter(req => {
    // Basic criteria: Must be Blue team and in waiting status
    const isBlueTeam = req.team === 'Blue';
    const isWaiting = req.status === 'waiting';
    const isNotCurrentUser = req.user_id !== user?.id;
    
    // Should include this user if they meet the criteria
    return isBlueTeam && isWaiting && isNotCurrentUser;
  });

  // Handle creating a new request to join the arena
  const handleJoinArena = async () => {
    if (!selectedTeam || !selectedLab) {
      alert('Please select a team and a lab');
      return;
    }

    setLoading(true);
    try {
      // Create a request object with the necessary fields
      const requestData: any = {
        lab_id: selectedLab,
        status: 'waiting',
        team: selectedTeam
      };
      
      await createOperationRequest(requestData);
      
      // After creating the request, we stay on this page to see other users
      // Explicitly reload arena requests to make sure we see the latest data
      await loadArenaRequests();
      
    } catch (error: any) {
      console.error('Error joining arena:', error);
      // Show a more descriptive error message if available
      if (error.message) {
        alert(`Failed to join arena: ${error.message}`);
      } else {
        alert('Failed to join arena. Please try again or select a different lab.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle sending an invite to another user
  const handleInviteUser = async (request: OperationRequest) => {
    if (!user) return;
    
    setInvitingUser(request.user_id);
    try {
      // First try the standard approach through the hook
      try {
        await sendInvite(request.id);
        console.log('Successfully sent invite through hook');
      } catch (hookError) {
        console.error('Error with hook invite method:', hookError);
        
        // If the hook method fails, try a direct approach
        console.log('Attempting direct database update as fallback...');
        
        try {
          // Try direct database update
          const { error: directError } = await supabase
            .from('match_requests')
            .update({ 
              status: 'invited',
              partner_id: user.id,
              partner_username: user.user_metadata?.username || user.email
            })
            .eq('id', request.id);
            
          if (directError) {
            console.error('Direct update also failed:', directError);
            throw hookError; // Throw the original error
          } else {
            console.log('Direct update successful');
          }
        } catch (directError) {
          console.error('Fallback approach failed:', directError);
          throw hookError; // Throw the original error
        }
      }
      
      // Show success message
      setInviteSuccess(true);
      
      // Refresh the requests list to see the updated status
      loadArenaRequests();
      
      setTimeout(() => setInviteSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error sending invite:', error);
      // Show a more descriptive error message if available
      if (error.message) {
        alert(`Failed to send invite: ${error.message}`);
      } else {
        alert('Failed to send invite. Please try again.');
      }
    } finally {
      setInvitingUser('');
    }
  };

  // Handle accepting an invite
  const handleAcceptInvite = async () => {
    if (!pendingInvite) return;
    
    setIsAccepting(true);
    try {
      console.log('Accepting invite:', pendingInvite);
      
      // If the invite is not in 'invited' status, we need to update it first
      if (pendingInvite.status !== 'invited' && user) {
        console.log('Invite not in invited status, attempting to fix...');
        try {
          // Try three different approaches to ensure the status gets updated
          
          // Approach 1: Standard update
          const { error: updateError } = await supabase
            .from('match_requests')
            .update({ 
              status: 'invited',
              // Ensure these fields are set if they weren't before
              partner_id: user.id,
              partner_username: user.user_metadata?.username || user.email
            })
            .eq('id', pendingInvite.id);
          
          if (updateError) {
            console.error('Failed to update request status with standard approach:', updateError);
            
            // Approach 2: Try RPC if available
            try {
              const { error: rpcError } = await supabase.rpc('update_match_request_status', {
                request_id: pendingInvite.id,
                new_status: 'invited',
                partner_user_id: user?.id || '',
                partner_name: user?.user_metadata?.username || user?.email || 'Anonymous'
              });
              
              if (rpcError) {
                console.error('Failed to update request status with RPC approach:', rpcError);
                
                // Approach 3: If all else fails, try to recreate it as a new request
                // This is a last resort to avoid leaving the user stuck
                console.log('Attempting emergency approach to fix invitation');
                
                // Use a fully-formed invite object
                const updatedInvite = {
                  ...pendingInvite,
                  status: 'invited',
                  partner_id: user.id,
                  partner_username: user.user_metadata?.username || user.email
                };
                
                // Use operations hook to handle this properly
                await sendInvite(pendingInvite.id);
              }
            } catch (rpcAttemptError) {
              console.error('Failed to use fallback approaches:', rpcAttemptError);
            }
          } else {
            console.log('Successfully updated request status to invited');
            // Reload to get the updated request
            await loadArenaRequests();
          }
        } catch (statusError) {
          console.error('Error fixing invite status:', statusError);
          // Continue anyway - we'll try to accept it as is
        }
      }
      
      try {
        // Attempt to accept with multiple retries if needed
        let sessionInfo = null;
        let acceptError = null;
        
        // First attempt - standard accept through the hook
        try {
          console.log('First attempt: Accepting invite via standard acceptInvite hook');
          sessionInfo = await acceptInvite(pendingInvite.id);
        } catch (error1) {
          console.error('First attempt failed:', error1);
          acceptError = error1;
          
          // Second attempt - try direct database operations if hook fails
          try {
            console.log('Second attempt: Trying direct database operations');
            
            // 1. Create session directly
            if (!user) {
              throw new Error('User not authenticated');
            }
            
            // Create basic session data without potentially missing columns
            const sessionData = {
              red_user_id: pendingInvite.team === 'Red' ? pendingInvite.user_id : user.id,
              blue_user_id: pendingInvite.team === 'Blue' ? pendingInvite.user_id : user.id,
              lab_id: pendingInvite.lab_id,
              status: 'active'
            };
            
            // Try to check if request_id column exists
            try {
              const { error: requestIdError } = await supabase
                .from('lab_sessions')
                .select('request_id')
                .limit(1);
                
              if (!requestIdError) {
                console.log('request_id column exists, including it');
                // @ts-ignore - Property might not exist on type
                sessionData.request_id = pendingInvite.id;
              }
            } catch (columnError) {
              console.warn('Could not check for request_id column');
            }
            
            // Try to create session with minimal required fields
            const { data: session, error: sessionError } = await supabase
              .from('lab_sessions')
              .insert(sessionData)
              .select()
              .single();
              
            if (sessionError) {
              throw new Error(`Direct session creation failed: ${sessionError.message}`);
            }
            
            // 2. Update request status
            await supabase
              .from('match_requests')
              .update({ 
                status: 'matched',
                session_id: session.id
              })
              .eq('id', pendingInvite.id);
              
            // 3. Construct session info manually
            sessionInfo = {
              sessionId: session.id,
              team: pendingInvite.team === 'Red' ? 'Blue' : 'Red',
              labId: pendingInvite.lab_id
            };
            
            console.log('Second attempt successful, created session:', sessionInfo);
          } catch (error2) {
            console.error('Second attempt also failed:', error2);
            // Use the first error as it's likely more descriptive
            throw acceptError;
          }
        }
        
        if (!sessionInfo) {
          throw new Error('Failed to create session: No session information returned');
        }
        
        // Redirect to the appropriate lab page based on team
        const { sessionId, team, labId } = sessionInfo;
        
        // Determine the appropriate URL based on the team
        let redirectUrl;
        if (team === 'Red') {
          redirectUrl = `/red-vs-blue/lab/${labId}?session=${sessionId}&team=red`;
        } else {
          redirectUrl = `/red-vs-blue/lab/${labId}?session=${sessionId}&team=blue`;
        }
        
        console.log('Redirecting to lab interface:', redirectUrl);
        
        // Redirect to the session page
        navigate(redirectUrl);
      } catch (error: any) {
        console.error('Error accepting invite:', error);
        // Show a more descriptive error message if available
        if (error.message) {
          alert(`Failed to accept invite: ${error.message}`);
        } else {
          alert('Failed to accept invite. Please try again.');
        }
        setPendingInvite(null); // Clear the pending invite to avoid getting stuck
      }
    } finally {
      setIsAccepting(false);
    }
  };

  // Handle declining an invite
  const handleDeclineInvite = async () => {
    if (!pendingInvite) return;
    
    setIsDeclining(true);
    try {
      console.log('Attempting to decline invite:', pendingInvite);
      
      // If there's any problem with the invite, try to fix the status first
      if (pendingInvite.status !== 'invited' && user) {
        console.log('Invite not in correct status, attempting to normalize before declining...');
        try {
          // Try to update to 'invited' first, to establish a relationship
          const { error } = await supabase
            .from('match_requests')
            .update({ 
              status: 'invited',
              partner_id: user.id,
              partner_username: user.user_metadata?.username || user.email
            })
            .eq('id', pendingInvite.id);
            
          if (error) {
            console.warn('Could not update invite status before declining, proceeding anyway:', error);
          }
        } catch (updateError) {
          console.warn('Error updating invite before declining, proceeding anyway:', updateError);
        }
      }
      
      // Call the declineInvite function from our hook
      await declineInvite(pendingInvite.id);
      setPendingInvite(null);
      setInviteDeclined(true);
      // Auto-hide the success message after 3 seconds
      setTimeout(() => setInviteDeclined(false), 3000);
    } catch (error: any) {
      console.error('Error declining invite:', error);
      
      // Try a direct approach if the hook method fails
      try {
        console.log('Attempting direct decline as fallback...');
        const { error: directError } = await supabase
          .from('match_requests')
          .update({ status: 'declined' })
          .eq('id', pendingInvite.id);
          
        if (!directError) {
          console.log('Direct decline successful');
          setPendingInvite(null);
          return;
        } else {
          console.error('Direct decline also failed:', directError);
        }
      } catch (directError) {
        console.error('Error with direct decline:', directError);
      }
      
      // Show a more descriptive error message if available
      if (error.message) {
        alert(`Failed to decline invite: ${error.message}`);
      } else {
        alert('Failed to decline invite. Please try again.');
      }
    } finally {
      setIsDeclining(false);
    }
  };

  // Render a user card for the waiting list
  const UserCard = ({ request, onInvite }: UserCardProps) => {
    const lab = availableLabs.find(lab => lab.id === request.lab_id);
    
    // Check if we've already invited this person (using more lenient detection)
    const sentInvites = typedRequests.filter(req => 
      req.user_id === request.user_id && 
      req.partner_id === user?.id
    );
    
    // Check specifically for a formal invite with 'invited' status
    const hasInvite = sentInvites.some(req => req.status === 'invited');
    
    // If we've sent an invite but it's not in 'invited' status yet
    const hasPendingInvite = sentInvites.some(req => req.status === 'waiting');
    
    return (
      <div className={`border rounded-xl p-4 shadow-md hover:shadow-lg transition-all ${
        hasInvite 
          ? 'bg-primary/10 border-primary/40 animate-pulse-slow' 
          : hasPendingInvite
            ? 'bg-yellow-500/10 border-yellow-500/40' 
            : 'bg-background-light/80 border-primary/20 hover:border-primary/40'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${request.team === 'Red' ? 'bg-red-400/20' : 'bg-blue-400/20'}`}>
            {request.team === 'Red' ? 
              <Flame className="h-6 w-6 text-red-400" /> : 
              <Shield className="h-6 w-6 text-blue-400" />
            }
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white flex items-center gap-2">
              {request.username || 'Anonymous User'}
              {hasInvite && <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">Invited</span>}
              {hasPendingInvite && <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">Invitation Pending</span>}
            </h3>
            <p className="text-white/60 text-sm">{lab?.name || 'Unknown Lab'}</p>
            <p className="text-white/40 text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" /> {new Date(request.created_at).toLocaleTimeString()}
            </p>
          </div>
          <button 
            className="btn-primary px-3 py-1.5 text-sm rounded-lg flex items-center gap-1"
            onClick={() => onInvite(request)}
            disabled={invitingUser === request.user_id || hasInvite || hasPendingInvite}
          >
            {invitingUser === request.user_id ? (
              <>
                <span className="animate-spin mr-1">⟳</span> Inviting...
              </>
            ) : hasInvite ? (
              'Invited'
            ) : hasPendingInvite ? (
              <span className="text-yellow-400">Processing...</span>
            ) : (
              <>
                <UserPlus className="h-4 w-4" /> Invite
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen text-white pb-20" style={{ background: 'radial-gradient(ellipse at 60% 20%, #181024 0%, #0A030F 100%)' }}>
      <div className="max-w-6xl mx-auto pt-28 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-red-400 via-primary to-blue-400 text-transparent bg-clip-text">
            Operation Arena
          </h1>
          <p className="text-xl max-w-3xl mx-auto">
            Welcome to the arena. Here you can find other operators waiting for a partner.
            Choose your team, invite others, or wait to be invited.
          </p>
        </div>

        {/* Pending Invite Alert */}
        {pendingInvite && (
          <div className={`border rounded-xl p-6 mb-10 ${
            pendingInvite.status === 'invited' 
              ? 'bg-primary/20 border-primary animate-pulse-slow' 
              : 'bg-yellow-500/20 border-yellow-500'
          }`}>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" /> 
                  {pendingInvite.status === 'invited' ? "You've been invited!" : "Potential Invitation Detected"}
                </h3>
                <p className="text-white/80">
                  {pendingInvite.partner_username || 'Another user'} has invited you to join a {pendingInvite.team === 'Red' ? 'Blue' : 'Red'} Team operation.
                </p>
                <div className="mt-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                      pendingInvite.status === 'invited' 
                        ? 'bg-green-500/20 text-green-300' 
                        : 'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      Status: {pendingInvite.status}
                    </span>
                    <span className="text-white/60">ID: {pendingInvite.id.substring(0, 8)}...</span>
                    <span className="text-white/60">Team: {pendingInvite.team}</span>
                  </div>
                  {pendingInvite.status !== 'invited' && (
                    <p className="mt-1 text-xs text-yellow-300">
                      Note: This invitation was detected but may not have been fully processed. You can still accept it.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  className="btn-primary px-5 py-2 font-bold rounded-lg flex items-center gap-2"
                  onClick={handleAcceptInvite}
                  disabled={isAccepting || isDeclining}
                >
                  {isAccepting ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span> Accepting...
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-5 w-5" /> Accept Invite
                    </>
                  )}
                </button>
                <button 
                  className="btn-outline px-5 py-2 font-bold rounded-lg border-red-400 text-red-400 hover:bg-red-400/10"
                  onClick={() => handleDeclineInvite()}
                  disabled={isAccepting || isDeclining}
                >
                  {isDeclining ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span> Declining...
                    </>
                  ) : (
                    "Decline"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User's Current Status */}
        {hasActiveSessions && (
          <div className="bg-green-500/20 border border-green-400 rounded-xl p-6 mb-10">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-green-400" /> 
              You have active sessions
            </h3>
            <div className="space-y-4">
              {userActiveSessions.map((req) => (
                <div key={req.id} className="bg-black/30 rounded-lg p-4 flex flex-col md:flex-row gap-3 items-center">
                  <div className="flex-1">
                    <p className="text-white/80 mb-1">
                      <span className="font-semibold">{req.team} Team</span> operation with{" "}
                      <span className="font-semibold">{req.partner_username || "Partner"}</span>
                    </p>
                    <p className="text-xs text-white/60">Session ID: {req.session_id?.substring(0, 8)}...</p>
                  </div>
                  <button
                    onClick={() => handleEnterSession(req.session_id || "", req.lab_id)}
                    className="btn-primary px-6 py-2 rounded-lg flex items-center gap-2"
                  >
                    <Zap className="h-4 w-4" /> Enter Session
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {user && typedRequests.some(req => req.user_id === user.id && req.status === 'invited' && req.partner_id) ? (
          <div className="bg-accent-green/20 border border-accent-green rounded-xl p-6 mb-10">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-accent-green" /> 
              You've sent an invite
            </h3>
            <p className="text-white/80">
              {(() => {
                const myRequest = typedRequests.find(req => req.user_id === user.id && req.status === 'invited');
                return `You've invited ${myRequest?.partner_username || 'someone'} to join your ${myRequest?.team} Team operation. Waiting for them to accept or decline.`;
              })()}
            </p>
          </div>
        ) : user && typedRequests.some(req => req.user_id === user.id && req.status === 'waiting') ? (
          <div className="bg-accent-blue/20 border border-accent-blue rounded-xl p-6 mb-10">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent-blue" /> 
              You are in the waiting area
            </h3>
            <p className="text-white/80">
              You're currently waiting for someone to invite you. You can also invite others from the lists below.
              When someone invites you, an invitation card will appear here for you to accept or decline.
            </p>
          </div>
        ) : (
          <div className="bg-background-light/80 border border-primary/30 rounded-xl p-6 mb-10">
            <h3 className="text-xl font-bold mb-4">Join the Arena</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-white/80 mb-2">Choose Your Team</label>
                <div className="flex gap-4">
                  <button 
                    className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
                      selectedTeam === 'Red' 
                        ? 'bg-red-400/30 border-2 border-red-400' 
                        : 'bg-background-dark/60 border border-white/20 hover:border-red-400/60'
                    }`}
                    onClick={() => setSelectedTeam('Red')}
                  >
                    <Flame className={`h-5 w-5 ${selectedTeam === 'Red' ? 'text-red-400' : 'text-white/60'}`} />
                    <span className={selectedTeam === 'Red' ? 'font-bold text-red-400' : 'text-white/60'}>Red Team</span>
                  </button>
                  
                  <button 
                    className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
                      selectedTeam === 'Blue' 
                        ? 'bg-blue-400/30 border-2 border-blue-400' 
                        : 'bg-background-dark/60 border border-white/20 hover:border-blue-400/60'
                    }`}
                    onClick={() => setSelectedTeam('Blue')}
                  >
                    <Shield className={`h-5 w-5 ${selectedTeam === 'Blue' ? 'text-blue-400' : 'text-white/60'}`} />
                    <span className={selectedTeam === 'Blue' ? 'font-bold text-blue-400' : 'text-white/60'}>Blue Team</span>
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-white/80 mb-2">Select a Lab</label>
                <select 
                  className="w-full bg-background-dark/60 border border-white/20 text-white rounded-lg p-3 focus:border-primary/60 transition"
                  value={selectedLab}
                  onChange={(e) => setSelectedLab(e.target.value)}
                >
                  <option value="">Select a Lab</option>
                  {availableLabs.map(lab => (
                    <option key={lab.id} value={lab.id}>{lab.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <button 
              className="btn-primary w-full py-3 text-lg font-bold rounded-lg flex items-center justify-center gap-2"
              onClick={handleJoinArena}
              disabled={loading || !selectedTeam || !selectedLab}
            >
              {loading ? 'Joining...' : (
                <>
                  <Users className="h-5 w-5" /> Enter the Arena
                </>
              )}
            </button>
          </div>
        )}

        {/* Success message for invites */}
        {inviteSuccess && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-xl animate-fade-in z-50">
            Invite sent successfully!
          </div>
        )}

        {/* Success message for declined invites */}
        {inviteDeclined && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-xl animate-fade-in z-50">
            Invite declined successfully.
          </div>
        )}

        {/* Notification when your sent invite was declined */}
        {sentInviteDeclined && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-xl animate-fade-in z-50">
            Your invitation was declined.
          </div>
        )}

        {/* Invitation Card - Shows when user has a pending invite */}
        {pendingInvite && (
          <div className="mb-8 border-2 border-primary rounded-xl overflow-hidden shadow-lg animate-pulse-slow">
            <div className="bg-gradient-to-r from-primary/20 to-background-dark p-6">
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className={`p-4 rounded-full ${pendingInvite.team === 'Red' ? 'bg-blue-400/20' : 'bg-red-400/20'}`}>
                  {pendingInvite.team === 'Red' ? 
                    <Shield className="h-8 w-8 text-blue-400" /> : 
                    <Flame className="h-8 w-8 text-red-400" />
                  }
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <div className="text-xl font-bold text-white">
                    You've been invited!
                  </div>
                  <p className="text-white/80">
                    <span className="font-semibold">{pendingInvite.username || 'An operator'}</span> has invited you to join a{' '}
                    <span className={pendingInvite.team === 'Red' ? 'text-blue-400 font-bold' : 'text-red-400 font-bold'}>
                      {pendingInvite.team === 'Red' ? 'Blue' : 'Red'} Team
                    </span> operation.
                  </p>
                  <p className="text-white/60 text-sm mt-1">
                    Lab: {availableLabs.find(lab => lab.id === pendingInvite.lab_id)?.name || 'Unknown Lab'}
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    className="btn-success px-5 py-2 rounded-lg flex items-center gap-2 font-bold"
                    onClick={handleAcceptInvite}
                    disabled={isAccepting}
                  >
                    {isAccepting ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Accepting...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5" />
                        <span>Accept</span>
                      </div>
                    )}
                  </button>
                  
                  <button 
                    className="btn-error px-5 py-2 rounded-lg flex items-center gap-2 font-bold"
                    onClick={handleDeclineInvite}
                    disabled={isDeclining}
                  >
                    {isDeclining ? 'Declining...' : 'Decline'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Waiting Users Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Red Team Users */}
          <div className="bg-background-dark/80 border border-red-400/30 rounded-xl p-6">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-4 pb-2 border-b border-red-400/30">
              <Flame className="h-5 w-5 text-red-400" /> Red Team Operators
            </h3>
            
            {redTeamUsers.length > 0 ? (
              <div className="space-y-3">
                {redTeamUsers.map(request => (
                  <UserCard 
                    key={request.id} 
                    request={request} 
                    onInvite={handleInviteUser}
                  />
                ))}
              </div>
            ) : (
              <p className="text-white/60 text-center py-6">No Red Team operators waiting. If you've sent an invitation, it will show as a card above.</p>
            )}
          </div>
          
          {/* Blue Team Users */}
          <div className="bg-background-dark/80 border border-blue-400/30 rounded-xl p-6">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-4 pb-2 border-b border-blue-400/30">
              <Shield className="h-5 w-5 text-blue-400" /> Blue Team Operators
            </h3>
            
            {blueTeamUsers.length > 0 ? (
              <div className="space-y-3">
                {blueTeamUsers.map(request => (
                  <UserCard 
                    key={request.id} 
                    request={request} 
                    onInvite={handleInviteUser}
                  />
                ))}
              </div>
            ) : (
              <p className="text-white/60 text-center py-6">No Blue Team operators waiting. If you've sent an invitation, it will show as a card above.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArenaPage;
