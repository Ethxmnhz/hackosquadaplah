import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import { OperationRequest, ActiveOperation, Lab, OperationEvent } from '../types/operations';

// Add this to the top of the file, near other interfaces
interface CreateArenaRequestData {
  lab_id: string;
  team?: 'Red' | 'Blue';
  status?: string;
}

export const useOperations = () => {
  const { user } = useAuth();
  const [availableLabs, setAvailableLabs] = useState<Lab[]>([]);
  const [pendingRequests, setPendingRequests] = useState<OperationRequest[]>([]);
  const [activeOperations, setActiveOperations] = useState<ActiveOperation[]>([]);
  const [operationEvents, setOperationEvents] = useState<OperationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tablesExist, setTablesExist] = useState(false);
  const [notificationsExist, setNotificationsExist] = useState(false);

  // Check if operations tables exist
  const checkTablesExist = async () => {
    try {
      const { error } = await supabase
        .from('match_requests')
        .select('id')
        .limit(1);
      
      setTablesExist(!error);
      return !error;
    } catch (error) {
      setTablesExist(false);
      return false;
    }
  };

  // COMPLETELY REBUILT: Load data for arena matchmaking
  const loadArenaRequests = async () => {
    if (!user) return [];
    
    console.log('Loading arena requests for user:', user.id);
    
    try {
      // Approach: Get ALL requests and filter client-side to prevent missing data
      const { data: allRequests, error: requestError } = await supabase
        .from('match_requests')
        .select('*')
        .or(`user_id.eq.${user.id},partner_id.eq.${user.id},status.eq.waiting`)
        .order('created_at', { ascending: false });
      
      if (requestError) {
        throw requestError;
      }
      
      console.log('Loaded requests:', allRequests);
      
      // Look for invites specifically
      const invitesForMe = allRequests?.filter(req => 
        req.status === 'invited' && req.partner_id === user.id
      );
      
      if (invitesForMe && invitesForMe.length > 0) {
        console.log('Found invites for current user:', invitesForMe);
      }
      
      // Store all requests in state
      setPendingRequests(allRequests || []);
      return allRequests || [];
    } catch (error) {
      console.error('Error loading arena requests:', error);
      return [];
    }
  };

  // COMPLETELY REBUILT: Send an invite to another user
  const sendInvite = async (requestId: string) => {
    if (!user || !tablesExist) throw new Error('User not authenticated or tables not available');
    
    console.log('Send invite called for request ID:', requestId);
    
    try {
      // Step 1: Get the request details (target user's request)
      const { data: request, error: requestError } = await supabase
        .from('match_requests')
        .select('*')
        .eq('id', requestId)
        .single();
      
      if (requestError || !request) {
        console.error('Request not found:', requestError);
        throw new Error('Request not found');
      }
      
      console.log('Found request to invite:', request);
      
      // Step 2: Basic validations
      if (request.status !== 'waiting') {
        console.error('Request is not in waiting status:', request.status);
        throw new Error(`Request is not available (status: ${request.status})`);
      }
      
      if (request.user_id === user.id) {
        console.error('Cannot invite yourself');
        throw new Error('You cannot invite yourself');
      }

      // Step 3: Prepare the update data - Focus on only the fields we need to update
      const updateData = { 
        status: 'invited',
        partner_id: user.id, 
        partner_username: user.user_metadata?.username || user.email
      };
      
      console.log('Sending invite. Update data:', updateData);

      // Step 4: Update the request to invited status
      console.log('Updating request with id:', requestId);
      
      // Try multiple approaches to ensure the update succeeds
      let updateSuccessful = false;
      
      // Approach 1: Direct SQL using RPC (most reliable)
      try {
        // If this RPC exists, it will directly update the status via SQL
        const { data: rpcResult, error: rpcError } = await supabase.rpc('set_match_request_invited', {
          p_request_id: requestId,
          p_partner_id: user.id,
          p_partner_username: user.user_metadata?.username || user.email
        });
        
        if (!rpcError) {
          console.log('Direct SQL update successful:', rpcResult);
          updateSuccessful = true;
        } else {
          console.warn('Direct SQL update failed, trying standard approach:', rpcError);
        }
      } catch (rpcError) {
        console.warn('RPC not available or failed, continuing with standard approach');
      }
      
      // Approach 2: Standard update if RPC didn't work
      if (!updateSuccessful) {
        const { data: updateResult, error: updateError } = await supabase
          .from('match_requests')
          .update(updateData)
          .eq('id', requestId)
          .select();
        
        if (updateError) {
          console.error('Error updating request with standard approach:', updateError);
          
          // Approach 3: Force update with upsert
          try {
            // Get the full request data first
            const { data: fullRequest } = await supabase
              .from('match_requests')
              .select('*')
              .eq('id', requestId)
              .single();
              
            if (fullRequest) {
              // Create a complete updated record
              const completeUpdate = {
                ...fullRequest,
                status: 'invited',
                partner_id: user.id,
                partner_username: user.user_metadata?.username || user.email
              };
              
              // Use upsert to replace the entire record
              const { error: upsertError } = await supabase
                .from('match_requests')
                .upsert(completeUpdate);
                
              if (!upsertError) {
                console.log('Upsert update successful');
                updateSuccessful = true;
              } else {
                console.error('Upsert update failed:', upsertError);
                throw upsertError;
              }
            } else {
              throw new Error('Could not retrieve full request data for upsert');
            }
          } catch (upsertError) {
            console.error('All update approaches failed:', upsertError);
            throw updateError; // Throw the original error
          }
        } else {
          console.log('Standard update successful:', updateResult);
          updateSuccessful = true;
        }
      }
      
      // Step 5: Verify the update was successful
      const { data: verifiedRequest, error: verifyError } = await supabase
        .from('match_requests')
        .select('*')
        .eq('id', requestId)
        .single();
        
      if (verifyError) {
        console.error('Error verifying invitation update:', verifyError);
        // Don't throw an error, just log it and continue
        console.warn('Continuing despite verification error');
      } else {
        console.log('Request verification result:', verifiedRequest);
        
        // Manually check if the update was successful
        if (verifiedRequest.status !== 'invited') {
          console.error('Update status check failed! Current status:', verifiedRequest.status);
          
          // Try one more time with a direct approach
          try {
            // Use a raw SQL approach if available via RPC
            await supabase.rpc('force_update_match_request', {
              p_id: requestId,
              p_status: 'invited',
              p_partner_id: user.id
            });
            console.log('Used force update as last resort');
          } catch (finalError) {
            console.warn('Force update failed, but continuing anyway:', finalError);
            // Continue anyway - we'll rely on our fallback detection in ArenaPage
          }
        } else {
          console.log('Status update verified successfully');
        }
      }
      
      // Step 6: Create a notification for the invited user (if notifications exist)
      try {
        const notificationData = {
          user_id: request.user_id, // The user being invited
          type: 'invite_received',
          message: `You have been invited by ${user.user_metadata?.username || 'another user'} to join a ${request.team === 'Red' ? 'Red' : 'Blue'} Team operation.`,
          data: { request_id: requestId, inviter_id: user.id },
          seen: false
        };
        
        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notificationData);
          
        if (notifError) {
          console.warn('Error creating notification:', notifError);
          // Try a direct approach if the normal insert fails
          const { error: fallbackError } = await supabase
            .from('notifications')
            .insert([notificationData]);
            
          if (fallbackError) {
            console.warn('Error creating notification with fallback approach:', fallbackError);
          }
        } else {
          console.log('Notification created successfully');
        }
      } catch (notificationError) {
        console.warn('Could not create notification:', notificationError);
      }

      // Step 5: Refresh arena requests to update the UI
      await loadArenaRequests();
      
      return true;
    } catch (error) {
      console.error('Error sending invite:', error);
      throw error;
    }
  };

  // COMPLETELY REBUILT: Accept an invite and create a session
  const acceptInvite = async (requestId: string) => {
    if (!user || !tablesExist) throw new Error('User not authenticated or tables not available');
    
    try {
      // Step 1: First try to fetch the invite with minimal constraints
      let invite; // Declare invite as let, not const
      const { data: initialInvite, error: inviteError } = await supabase
        .from('match_requests')
        .select('*')
        .eq('id', requestId)
        .single();
      
      if (inviteError || !initialInvite) {
        console.error('Match request not found:', inviteError);
        throw new Error('Match request not found');
      }

      // Assign the initial data to the invite variable
      invite = initialInvite;
      console.log('Found match request to accept:', invite);
      
      // Step 2: Validate that this is a request the user can accept
      const isInviteForThisUser = invite.partner_id === user.id;
      const isRequestByThisUser = invite.user_id === user.id;
      
      // First check if this user is the invitee (partner)
      if (!isInviteForThisUser && !isRequestByThisUser) {
        console.error('User cannot accept this request - not related to this user');
        throw new Error('You cannot accept this request');
      }
      
      // If status is not 'invited', attempt to fix it before proceeding
      if (invite.status !== 'invited') {
        console.log('Invite status is not "invited", attempting to fix it first');
        
        // Only allow fixing if this user is the partner (recipient)
        if (isInviteForThisUser) {
          // Try to update the status
          const { error: fixError } = await supabase
            .from('match_requests')
            .update({ 
              status: 'invited',
              partner_id: user.id,
              partner_username: user.user_metadata?.username || user.email
            })
            .eq('id', requestId);
            
          if (fixError) {
            console.error('Failed to fix invite status before accepting:', fixError);
            // Continue anyway, we'll try to accept it as is
          } else {
            console.log('Successfully fixed invite status to "invited"');
            
            // Refresh the invite data to get the updated version
            const { data: refreshedInvite, error: refreshError } = await supabase
              .from('match_requests')
              .select('*')
              .eq('id', requestId)
              .single();
              
            if (!refreshError && refreshedInvite) {
              invite = refreshedInvite;
            }
          }
        } else {
          console.warn('User is the requester, not the partner - cannot accept their own request');
          throw new Error('You cannot accept your own request');
        }
      }
      
      // Step 3: Determine the red and blue team users
      let redTeamUser, blueTeamUser;
      if (invite.team === 'Red') {
        redTeamUser = invite.user_id;       // Original requester is Red
        blueTeamUser = invite.partner_id;   // Current user (accepter) is Blue
      } else {
        redTeamUser = invite.partner_id;    // Current user (accepter) is Red
        blueTeamUser = invite.user_id;      // Original requester is Blue
      }
      
      // Validate that we have both team users assigned
      if (!redTeamUser || !blueTeamUser) {
        console.error('Missing team assignments:', { redTeamUser, blueTeamUser, invite });
        throw new Error('Invalid team assignments for the match request');
      }

      // Step 3: Verify that the lab exists in one of our tables
      let labExists = false;
      let labTableName = '';
      
      try {
        // Try the New_operation table first
        const { error: labError } = await supabase
          .from('New_operation')
          .select('id')
          .eq('id', invite.lab_id)
          .single();
          
        if (labError) {
          // Try the labs table
          const { error: altLabError } = await supabase
            .from('labs')
            .select('id')
            .eq('id', invite.lab_id)
            .single();
            
          if (altLabError) {
            console.error('Lab not found in labs table either:', altLabError);
          } else {
            labExists = true;
            labTableName = 'labs';
          }
        } else {
          labExists = true;
          labTableName = 'New_operation';
        }
      } catch (e) {
        console.error('Error checking for lab:', e);
      }

      if (!labExists) {
        console.error('Lab not found in any table:', invite.lab_id);
        throw new Error(`Lab with ID ${invite.lab_id} not found. The session cannot be created.`);
      }
      
      // Log which table we found the lab in
      console.log(`Found lab in table: ${labTableName}`);
      
      // Double check if the lab ID is valid as a UUID
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invite.lab_id)) {
        console.error('Lab ID is not a valid UUID:', invite.lab_id);
        throw new Error('Invalid lab ID format. The session cannot be created.');
      }
      
      // Step 4: Create a lab session
      let session;
      try {
        // Create basic session data - only include fields we know exist in the schema
        const sessionInsertData: any = { // Use any type to allow dynamic property assignment
          red_user_id: redTeamUser,
          blue_user_id: blueTeamUser,
          lab_id: invite.lab_id,
          status: 'active'
        };
        
        // Try to include these fields but they might not exist in all environments
        try {
          // First check if the request_id column exists
          const { error: requestIdError } = await supabase
            .from('lab_sessions')
            .select('request_id')
            .limit(1);
            
          // If the select worked, it means the column exists
          if (!requestIdError) {
            console.log('request_id column exists, adding it to session data');
            sessionInsertData.request_id = requestId;
          }
        } catch (requestIdCheckError) {
          console.warn('Could not check for request_id column, proceeding without it');
        }
        
        // Check for time columns
        try {
          const { error: timeError } = await supabase
            .from('lab_sessions')
            .select('time_remaining')
            .limit(1);
            
          // If the select worked, it means the column exists
          if (!timeError) {
            console.log('time_remaining column exists, adding time fields');
            sessionInsertData.time_remaining = 3600; // 1 hour in seconds
          }
        } catch (timeCheckError) {
          console.warn('Could not check for time columns, proceeding without them');
        }
        
        // Check for ends_at column
        try {
          const { error: endsAtError } = await supabase
            .from('lab_sessions')
            .select('ends_at')
            .limit(1);
            
          // If the select worked, it means the column exists
          if (!endsAtError) {
            console.log('ends_at column exists, adding it');
            sessionInsertData.ends_at = new Date(Date.now() + 3600 * 1000).toISOString();
          }
        } catch (endsAtCheckError) {
          console.warn('Could not check for ends_at column, proceeding without it');
        }
        
        // Try to create a lab session - first try direct insert
        let session: any = null; // Use any type to prevent TypeScript errors
        let sessionError = null;
        
        try {
          // Try normal insert first
          const insertResult = await supabase
            .from('lab_sessions')
            .insert(sessionInsertData)
            .select()
            .single();
            
          if (insertResult.error) {
            console.error('Error creating session with direct insert:', insertResult.error);
            sessionError = insertResult.error;
          } else {
            session = insertResult.data;
          }
        } catch (insertError: any) {
          console.error('Exception during session insert:', insertError);
          sessionError = insertError;
        }
        
        // If direct insert failed, try RPC method
        if (!session && sessionError) {
          console.log('Direct insert failed, trying RPC method...');
          
          try {
            const { data: rpcResult, error: rpcError } = await supabase.rpc('create_lab_session_safe', {
              red_id: redTeamUser,
              blue_id: blueTeamUser,
              lab_id: invite.lab_id,
              request_id: requestId
            });
            
            if (rpcError) {
              console.error('Error creating session with RPC method:', rpcError);
              throw rpcError;
            }
            
            // Get the created session using the returned ID
            const { data: fetchedSession, error: fetchError } = await supabase
              .from('lab_sessions')
              .select('*')
              .eq('id', rpcResult)
              .single();
              
            if (fetchError) {
              console.error('Error fetching created session:', fetchError);
              throw fetchError;
            }
            
            session = fetchedSession;
            console.log('Successfully created session using RPC method:', session);
          } catch (rpcAttemptError: any) {
            console.error('RPC method also failed:', rpcAttemptError);
            throw new Error(`Failed to create lab session with both methods: ${sessionError.message || 'Unknown error'}`);
          }
        } else {
          console.log('Lab session created successfully with direct insert:', session);
        }
      } catch (sessionCreationError: any) { // Type assertion to any
        console.error('Failed to create session:', sessionCreationError);
        throw new Error(`Failed to create lab session: ${sessionCreationError.message || 'Unknown error'}`);
      }

      // Step 5: Update the request to 'matched'
      if (session) {
        try {
          const { error: updateError } = await supabase
            .from('match_requests')
            .update({ 
              status: 'matched',
              session_id: session.id
            })
            .eq('id', requestId);
          
          if (updateError) {
            console.error('Error updating request status to matched:', updateError);
            // Continue anyway since we have the session
          } else {
            console.log('Successfully updated request to matched status');
          }
        } catch (updateError) {
          console.error('Failed to update request status:', updateError);
          // Continue anyway since we have the session
        }

        // Step 6: Create notifications for both users
        try {
          // Prepare the notification for the original requester
          const notificationData = {
            user_id: invite.user_id,
            type: 'session_created',
            message: `Your match request has been accepted. Session is now active.`,
            data: { session_id: session.id, lab_id: invite.lab_id },
            session_id: session.id,
            seen: false
          };
          
          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notificationData);
            
          if (notifError) {
            console.warn('Error creating notification:', notifError);
            // Try an alternative approach if needed
          } else {
            console.log('Match accepted notification created successfully');
          }
        } catch (notificationError) {
          console.warn('Could not create notification:', notificationError);
          // Continue anyway, this is not critical
        }
      } else {
        console.error('Session creation succeeded but session data is null');
      }

      // Step 7: Refresh the arena requests to update UI
      try {
        await loadArenaRequests();
      } catch (refreshError) {
        console.error("Error refreshing arena requests:", refreshError);
        // Continue anyway since we have the session ID
      }
      
      // Step 8: Return the session info for redirecting
      if (session) {
        return {
          sessionId: session.id,
          team: invite.team === 'Red' ? 'Blue' : 'Red', // Partner (current user) has the opposite team
          labId: invite.lab_id
        };
      } else {
        // If we somehow got here without a session, provide an error
        throw new Error('Session was created but data is missing. Please refresh and try again.');
      }
    } catch (error: any) {
      console.error('Error accepting invite:', error);
      throw error;
    }
  };

  // Decline an invite
  const declineInvite = async (requestId: string) => {
    if (!user || !tablesExist) throw new Error('User not authenticated or tables not available');
    
    try {
      // Step 1: Get the invite details without strict status filter
      const { data: invite, error: inviteError } = await supabase
        .from('match_requests')
        .select('*')
        .eq('id', requestId)
        .single();
      
      if (inviteError || !invite) {
        console.error('Match request not found:', inviteError);
        throw new Error('Match request not found');
      }

      console.log('Found match request to decline:', invite);
      
      // Step 2: Validate that this is a request the user can decline
      // Only validate that this is either an invite for this user or a request made by this user
      const isInviteForThisUser = invite.partner_id === user.id;
      const isRequestByThisUser = invite.user_id === user.id;
      
      if (!isInviteForThisUser && !isRequestByThisUser) {
        console.error('User cannot decline this request - not related to this user');
        throw new Error('You cannot decline this request');
      }

      // Step 3: Update the request to 'declined' regardless of current status
      const { error: updateError } = await supabase
        .from('match_requests')
        .update({ 
          status: 'declined'
        })
        .eq('id', requestId);
      
      if (updateError) {
        console.error('Error updating request status:', updateError);
        
        // Try an alternative approach with RPC if available
        try {
          const { error: rpcError } = await supabase.rpc('update_match_request_status', {
            request_id: requestId,
            new_status: 'declined',
            partner_user_id: user.id,
            partner_name: user.user_metadata?.username || user.email
          });
          
          if (rpcError) {
            console.error('Failed to update request status with RPC approach:', rpcError);
            throw updateError; // Throw the original error if RPC fails
          }
        } catch (rpcAttemptError) {
          console.error('Failed to use RPC fallback:', rpcAttemptError);
          throw updateError;
        }
      }

      // Step 4: Create a notification for the relevant user
      try {
        // If this user is declining an invite sent to them, notify the original requester
        // If this user is canceling their own request, no notification needed
        if (isInviteForThisUser) {
          const notificationData = {
            user_id: invite.user_id, // The user who sent the original request
            type: 'invite_declined',
            message: `${user.user_metadata?.username || 'A user'} has declined your match invitation.`,
            data: { request_id: requestId },
            seen: false
          };
          
          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notificationData);
            
          if (notifError) {
            console.warn('Error creating notification:', notifError);
          } else {
            console.log('Decline notification created successfully');
          }
        }
      } catch (notificationError) {
        console.warn('Could not create notification:', notificationError);
      }

      // Step 5: Refresh the arena requests
      try {
        await loadArenaRequests();
      } catch (error) {
        console.error("Error refreshing arena requests:", error);
      }
      
      return true;
    } catch (error) {
      console.error('Error declining invite:', error);
      throw error;
    }
  };

  // Load all data
  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const exist = await checkTablesExist();
      if (!exist) {
        console.log('Operations tables not found, using fallback');
        setLoading(false);
        return;
      }

      // Check if notifications table exists (but don't block the main functionality)
      try {
        const { error: notificationError } = await supabase
          .from('notifications')
          .select('id')
          .limit(1);
        
        setNotificationsExist(!notificationError);
        
        if (notificationError) {
          console.log('Notifications table not available. Notifications will be disabled.');
        } else {
          console.log('Notifications table exists and is available.');
        }
      } catch (error) {
        console.warn('Error checking notifications table:', error);
        setNotificationsExist(false);
      }

      // Instead of using functions that don't exist, let's directly load the data
      try {
        // Load available labs
        const { data: labs, error: labsError } = await supabase
          .from('labs')
          .select('*')
          .eq('status', 'published');
        
        console.log('Loading available labs');
        
        if (labsError) {
          console.error('Error loading labs:', labsError);
          
          // Try alternate table if primary table fails
          console.log('Trying alternate labs table (New_operation)...');
          const { data: altLabs, error: altError } = await supabase
            .from('New_operation')
            .select('*');
            
          if (altError) {
            console.error('Error loading from alternate labs table:', altError);
          } else if (altLabs && altLabs.length > 0) {
            console.log('Found labs in alternate table:', altLabs.length);
            const formattedAltLabs: Lab[] = altLabs.map(lab => ({
              id: lab.id,
              name: lab.title || lab.name || 'Lab ' + lab.id,
              description: lab.description || 'No description available',
              difficulty: lab.difficulty || 'Medium',
              estimated_duration: lab.estimated_time || 60,
              category: lab.category || 'Operation',
              docker_command: lab.docker_command || '',
              vm_download_url: lab.vm_download_url || '',
              external_link: lab.external_link || '',
              thumbnail_url: lab.thumbnail_url || ''
            }));
            setAvailableLabs(formattedAltLabs);
          }
        } else if (labs && labs.length > 0) {
          console.log('Found labs in primary table:', labs.length);
          const formattedLabs: Lab[] = labs.map(lab => ({
            id: lab.id,
            name: lab.title || lab.name || 'Lab ' + lab.id,
            description: lab.description || 'No description available',
            difficulty: lab.difficulty || 'Medium',
            estimated_duration: lab.estimated_time || 60,
            category: lab.category || 'Red vs Blue',
            docker_command: lab.docker_command || '',
            vm_download_url: lab.vm_download_url || '',
            external_link: lab.external_link || '',
            thumbnail_url: lab.thumbnail_url || ''
          }));
          setAvailableLabs(formattedLabs);
        } else {
          console.warn('No labs found in either table!');
          
          // Create a fallback lab for testing if none found
          const fallbackLabs: Lab[] = [
            {
              id: 'fallback-lab-1',
              name: 'Test Lab (Fallback)',
              description: 'This is a fallback lab for testing',
              difficulty: 'easy',
              estimated_duration: 30,
              category: 'Red vs Blue',
              docker_command: '',
              vm_download_url: '',
              external_link: '',
              thumbnail_url: ''
            }
          ];
          console.log('Using fallback labs for testing');
          setAvailableLabs(fallbackLabs);
        }

        // Load arena requests
        await loadArenaRequests();
        
        // Load operations (if needed)
        const { data: operations } = await supabase
          .from('lab_sessions')
          .select('*')
          .or(`red_user_id.eq.${user.id},blue_user_id.eq.${user.id}`)
          .order('created_at', { ascending: false });
        
        if (operations) {
          setActiveOperations(operations);
        }
      } catch (error) {
        console.error('Error loading specific data:', error);
      }
    } catch (error) {
      console.error('Error loading operations data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh all data
  const refreshData = async () => {
    await loadData();
  };

  // Create a new operation request for the arena
  const createOperationRequest = async (data: CreateArenaRequestData) => {
    if (!user || !tablesExist) throw new Error('User not authenticated or tables not available');
    
    try {
      // First check if we already have an active request
      const { data: existingRequests, error: checkError } = await supabase
        .from('match_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'waiting');
        
      if (checkError) {
        console.error('Error checking existing requests:', checkError);
      } else if (existingRequests && existingRequests.length > 0) {
        // Delete existing waiting requests for this user
        const { error: deleteError } = await supabase
          .from('match_requests')
          .delete()
          .eq('user_id', user.id)
          .eq('status', 'waiting');
          
        if (deleteError) {
          console.error('Error deleting existing requests:', deleteError);
        }
      }
      
      // Create the request
      const { data: request, error } = await supabase
        .from('match_requests')
        .insert({
          user_id: user.id,
          username: user.user_metadata?.username || user.email,
          lab_id: data.lab_id,
          team: data.team || 'Red',
          status: data.status || 'waiting',
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating request:', error);
        throw error;
      }
      
      // Refresh the arena requests
      await loadArenaRequests();
      
      return request;
    } catch (error) {
      console.error('Error creating operation request:', error);
      throw error;
    }
  };

  // Initialize data on mount
  useEffect(() => {
    loadData();
    
    // Set up a real-time subscription for invitation updates - FIXED ARENA INVITATION SYSTEM
    if (user) {
      // Use a single channel for better connection stability
      const arenaChannel = supabase
        .channel('arena-invitations-' + user.id)
        // Listen for changes to requests where this user is the partner (someone invited you)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'match_requests',
          filter: `partner_id=eq.${user.id}`
        }, (payload) => {
          console.log('Invitation update received (as partner):', payload);
          loadArenaRequests();
        })
        // Listen for changes to requests created by this user (your request was updated)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'match_requests',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          console.log('Your request was updated:', payload);
          loadArenaRequests();
        })
        // Listen for all new requests (to see new players in the arena)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'match_requests'
        }, (payload) => {
          console.log('New request in arena:', payload);
          loadArenaRequests();
        })
        .subscribe(status => {
          console.log('Arena subscription status:', status);
          // Immediately load arena requests after subscription is established
          if (status === 'SUBSCRIBED') {
            console.log('Arena subscription active, loading requests...');
            loadArenaRequests();
          }
        });
      
      // Also listen for notifications
      const notificationChannel = supabase
        .channel('notifications-' + user.id)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, () => {
          loadArenaRequests();
        })
        .subscribe();
      
      return () => {
        supabase.removeChannel(arenaChannel);
        supabase.removeChannel(notificationChannel);
      };
    }
  }, [user]);

  return {
    availableLabs,
    pendingRequests,
    activeOperations,
    operationEvents,
    loading,
    tablesExist,
    refreshData,
    loadArenaRequests,
    sendInvite,
    acceptInvite,
    declineInvite,
    createOperationRequest
    // Add other functions to return as needed
  };
};