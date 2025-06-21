import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import { OperationRequest, ActiveOperation, Lab, CreateOperationData, OperationEvent } from '../types/operations';

export const useOperations = () => {
  const { user } = useAuth();
  const [availableLabs, setAvailableLabs] = useState<Lab[]>([]);
  const [pendingRequests, setPendingRequests] = useState<OperationRequest[]>([]);
  const [activeOperations, setActiveOperations] = useState<ActiveOperation[]>([]);
  const [operationEvents, setOperationEvents] = useState<OperationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tablesExist, setTablesExist] = useState(false);

  // Check if operations tables exist
  const checkTablesExist = async () => {
    try {
      const { error } = await supabase
        .from('operation_requests')
        .select('id')
        .limit(1);
      
      setTablesExist(!error);
      return !error;
    } catch (error) {
      console.error('Operations tables not found:', error);
      setTablesExist(false);
      return false;
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

      await Promise.all([
        loadAvailableLabs(),
        loadPendingRequests(),
        loadActiveOperations(),
        loadOperationEvents()
      ]);
    } catch (error) {
      console.error('Error loading operations data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableLabs = async () => {
    try {
      const { data, error } = await supabase
        .from('labs')
        .select('*')
        .eq('status', 'published');

      if (error) throw error;
      
      const labs: Lab[] = (data || []).map(lab => ({
        id: lab.id,
        name: lab.title,
        description: lab.description,
        difficulty: lab.difficulty,
        estimated_duration: lab.estimated_time || 60,
        category: lab.category,
        docker_command: lab.docker_command,
        vm_download_url: lab.vm_download_url,
        external_link: lab.external_link,
        thumbnail_url: lab.thumbnail_url
      }));

      setAvailableLabs(labs);
    } catch (error) {
      console.error('Error loading labs:', error);
      setAvailableLabs([]);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('operation_requests')
        .select(`
          *,
          lab:labs(*),
          red_profile:profiles!operation_requests_red_team_user_fkey(username),
          blue_profile:profiles!operation_requests_blue_team_user_fkey(username)
        `)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (error) throw error;

      const requests: OperationRequest[] = (data || []).map(req => ({
        id: req.id,
        red_team_user: req.red_team_user,
        red_team_username: req.red_profile?.username || 'Unknown',
        blue_team_user: req.blue_team_user,
        blue_team_username: req.blue_profile?.username,
        lab: {
          id: req.lab.id,
          name: req.lab.title,
          description: req.lab.description,
          difficulty: req.lab.difficulty,
          estimated_duration: req.lab.estimated_time || 60,
          category: req.lab.category,
          docker_command: req.lab.docker_command,
          vm_download_url: req.lab.vm_download_url,
          external_link: req.lab.external_link,
          thumbnail_url: req.lab.thumbnail_url
        },
        status: req.status,
        operation_mode: req.operation_mode,
        estimated_duration: req.estimated_duration,
        max_score: req.max_score,
        created_at: req.created_at,
        expires_at: req.expires_at
      }));

      setPendingRequests(requests);
    } catch (error) {
      console.error('Error loading pending requests:', error);
      setPendingRequests([]);
    }
  };

  const loadActiveOperations = async () => {
    try {
      const { data, error } = await supabase
        .from('active_operations')
        .select(`
          *,
          lab:labs(*),
          red_profile:profiles!active_operations_red_team_user_fkey(username),
          blue_profile:profiles!active_operations_blue_team_user_fkey(username)
        `)
        .in('status', ['setup', 'active', 'paused']);

      if (error) throw error;

      const operations: ActiveOperation[] = (data || []).map(op => ({
        id: op.id,
        request_id: op.request_id,
        red_team_user: op.red_team_user,
        red_team_username: op.red_profile?.username || 'Unknown',
        blue_team_user: op.blue_team_user,
        blue_team_username: op.blue_profile?.username || 'Unknown',
        lab: {
          id: op.lab.id,
          name: op.lab.title,
          description: op.lab.description,
          difficulty: op.lab.difficulty,
          estimated_duration: op.lab.estimated_time || 60,
          category: op.lab.category,
          docker_command: op.lab.docker_command,
          vm_download_url: op.lab.vm_download_url,
          external_link: op.lab.external_link,
          thumbnail_url: op.lab.thumbnail_url
        },
        status: op.status,
        started_at: op.started_at,
        ends_at: op.ends_at,
        time_remaining: op.time_remaining || 0,
        red_team_score: op.red_team_score || 0,
        blue_team_score: op.blue_team_score || 0,
        flags_captured: op.flags_captured || 0,
        attacks_blocked: op.attacks_blocked || 0,
        total_events: op.total_events || 0,
        vpn_config: op.vpn_config || {
          server_address: '10.0.0.1',
          server_port: 1194,
          config_file: 'client\ndev tun\nproto udp\nremote 10.0.0.1 1194\nca ca.crt\ncert client.crt\nkey client.key',
          username: 'red_user',
          password: 'secure123'
        }
      }));

      setActiveOperations(operations);
    } catch (error) {
      console.error('Error loading active operations:', error);
      setActiveOperations([]);
    }
  };

  const loadOperationEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('operation_events')
        .select(`
          *,
          profile:profiles!operation_events_user_id_fkey(username)
        `)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;

      const events: OperationEvent[] = (data || []).map(event => ({
        id: event.id,
        operation_id: event.operation_id,
        user_id: event.user_id,
        username: event.profile?.username || 'Unknown',
        event_type: event.event_type,
        team_type: event.team_type,
        points_awarded: event.points_awarded,
        description: event.description,
        timestamp: event.timestamp
      }));

      setOperationEvents(events);
    } catch (error) {
      console.error('Error loading operation events:', error);
      setOperationEvents([]);
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
    
    // Set up real-time subscriptions
    const setupSubscriptions = async () => {
      const exists = await checkTablesExist();
      if (!exists) return;
      
      const requestsSubscription = supabase
        .channel('operation_requests_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'operation_requests' },
          () => loadPendingRequests()
        )
        .subscribe();

      const operationsSubscription = supabase
        .channel('active_operations_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'active_operations' },
          () => loadActiveOperations()
        )
        .subscribe();
        
      const eventsSubscription = supabase
        .channel('operation_events_changes')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'operation_events' },
          () => loadOperationEvents()
        )
        .subscribe();

      return () => {
        requestsSubscription.unsubscribe();
        operationsSubscription.unsubscribe();
        eventsSubscription.unsubscribe();
      };
    };
    
    setupSubscriptions();
  }, [user]);

  // Refresh data
  const refreshData = () => {
    loadData();
  };

  // Create operation request
  const createOperationRequest = async (data: CreateOperationData) => {
    if (!user || !tablesExist) throw new Error('User not authenticated or tables not available');
    
    try {
      const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Anonymous';
      
      const { data: newRequest, error } = await supabase
        .from('operation_requests')
        .insert({
          red_team_user: user.id,
          lab_id: data.lab_id,
          operation_mode: data.mode,
          estimated_duration: data.estimated_duration || 60,
          max_score: data.max_score || 1000,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
        })
        .select()
        .single();

      if (error) throw error;
      
      await loadPendingRequests();
      return newRequest;
    } catch (error) {
      console.error('Error creating operation request:', error);
      throw error;
    }
  };

  // Accept operation request
  const acceptOperationRequest = async (requestId: string) => {
    if (!user || !tablesExist) throw new Error('User not authenticated or tables not available');
    
    try {
      const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Anonymous';
      
      // First, get the request details
      const { data: request, error: requestError } = await supabase
        .from('operation_requests')
        .select('*')
        .eq('id', requestId)
        .eq('status', 'pending')
        .single();

      if (requestError || !request) {
        throw new Error('Request not found or already accepted');
      }

      if (request.red_team_user === user.id) {
        throw new Error('Cannot accept your own request');
      }

      // Update the request to accepted
      const { error: updateError } = await supabase
        .from('operation_requests')
        .update({
          status: 'accepted',
          blue_team_user: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Create the active operation
      const { data: operation, error: operationError } = await supabase
        .from('active_operations')
        .insert({
          request_id: requestId,
          red_team_user: request.red_team_user,
          blue_team_user: user.id,
          lab_id: request.lab_id,
          status: 'setup',
          time_remaining: request.estimated_duration * 60,
          ends_at: new Date(Date.now() + request.estimated_duration * 60 * 1000).toISOString(),
          vpn_config: {
            server_address: '10.0.0.1',
            server_port: 1194,
            config_file: 'client\ndev tun\nproto udp\nremote 10.0.0.1 1194\nca ca.crt\ncert client.crt\nkey client.key',
            username: 'red_user',
            password: 'secure123'
          }
        })
        .select()
        .single();

      if (operationError) throw operationError;

      // Add initial event
      await supabase
        .from('operation_events')
        .insert({
          operation_id: operation.id,
          user_id: user.id,
          event_type: 'defense_activated',
          team_type: 'blue',
          points_awarded: 0,
          description: `${username} joined as Blue Team defender`
        });

      // Update operation status to active after a short delay
      setTimeout(async () => {
        await supabase
          .from('active_operations')
          .update({ status: 'active' })
          .eq('id', operation.id);
      }, 2000);

      await Promise.all([loadPendingRequests(), loadActiveOperations()]);
      return operation.id;
    } catch (error) {
      console.error('Error accepting operation request:', error);
      throw error;
    }
  };

  // Submit flag
  const submitFlag = async (operationId: string, flag: string) => {
    if (!user || !tablesExist) throw new Error('User not authenticated or tables not available');
    
    try {
      const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Anonymous';
      
      // Validate flag format
      if (!flag.startsWith('HKQ{') || !flag.endsWith('}')) {
        throw new Error('Invalid flag format. Flags must be in format HKQ{...}');
      }

      const points = 100;
      
      // Add event
      const { error: eventError } = await supabase
        .from('operation_events')
        .insert({
          operation_id: operationId,
          user_id: user.id,
          event_type: 'flag_captured',
          team_type: 'red',
          points_awarded: points,
          description: `Flag captured: ${flag}`
        });

      if (eventError) throw eventError;

      // Update operation scores
      const { error: updateError } = await supabase
        .from('active_operations')
        .update({
          red_team_score: supabase.sql`red_team_score + ${points}`,
          flags_captured: supabase.sql`flags_captured + 1`,
          total_events: supabase.sql`total_events + 1`
        })
        .eq('id', operationId);

      if (updateError) throw updateError;

      await Promise.all([loadActiveOperations(), loadOperationEvents()]);
      return { success: true, points };
    } catch (error) {
      console.error('Error submitting flag:', error);
      throw error;
    }
  };

  // Block attack
  const blockAttack = async (operationId: string, attackType: string) => {
    if (!user || !tablesExist) throw new Error('User not authenticated or tables not available');
    
    try {
      const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Anonymous';
      const points = 75;
      
      // Add event
      const { error: eventError } = await supabase
        .from('operation_events')
        .insert({
          operation_id: operationId,
          user_id: user.id,
          event_type: 'attack_blocked',
          team_type: 'blue',
          points_awarded: points,
          description: `Blocked ${attackType} attack`
        });

      if (eventError) throw eventError;

      // Update operation scores
      const { error: updateError } = await supabase
        .from('active_operations')
        .update({
          blue_team_score: supabase.sql`blue_team_score + ${points}`,
          attacks_blocked: supabase.sql`attacks_blocked + 1`,
          total_events: supabase.sql`total_events + 1`
        })
        .eq('id', operationId);

      if (updateError) throw updateError;

      await Promise.all([loadActiveOperations(), loadOperationEvents()]);
      return { success: true, points };
    } catch (error) {
      console.error('Error blocking attack:', error);
      throw error;
    }
  };

  // End operation
  const endOperation = async (operationId: string, reason = 'completed') => {
    if (!tablesExist) return;
    
    try {
      await supabase
        .from('active_operations')
        .update({
          status: 'completed',
          time_remaining: 0
        })
        .eq('id', operationId);

      await supabase
        .from('operation_events')
        .insert({
          operation_id: operationId,
          user_id: user?.id || '',
          event_type: 'system_compromised',
          team_type: 'system',
          points_awarded: 0,
          description: `Operation ended: ${reason}`
        });

      await loadActiveOperations();
    } catch (error) {
      console.error('Error ending operation:', error);
      throw error;
    }
  };

  // Get user operations
  const getUserOperations = () => {
    if (!user) return { requests: [], operations: [] };
    
    const requests = pendingRequests.filter(req => 
      req.red_team_user === user.id || req.blue_team_user === user.id
    );
    
    const operations = activeOperations.filter(op => 
      op.red_team_user === user.id || op.blue_team_user === user.id
    );

    return { requests, operations };
  };

  // Get available operations for team type
  const getAvailableOperations = (teamType: 'red' | 'blue') => {
    if (!user) return [];
    
    if (teamType === 'blue') {
      // Blue team can see pending requests from red team (not their own)
      return pendingRequests.filter(req => 
        req.red_team_user !== user.id && !req.blue_team_user
      );
    } else {
      // Red team sees their own pending requests
      return pendingRequests.filter(req => req.red_team_user === user.id);
    }
  };

  // Add chat message to operation
  const addChatMessage = async (operationId: string, message: string, teamType: 'red' | 'blue') => {
    if (!user || !tablesExist) throw new Error('User not authenticated or tables not available');
    
    try {
      const { data, error } = await supabase
        .from('operation_chat')
        .insert({
          operation_id: operationId,
          user_id: user.id,
          message,
          team_type: teamType
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  };

  // Get chat messages for operation
  const getOperationChat = async (operationId: string) => {
    if (!tablesExist) return [];
    
    try {
      const { data, error } = await supabase
        .from('operation_chat')
        .select(`
          *,
          profile:profiles!operation_chat_user_id_fkey(username)
        `)
        .eq('operation_id', operationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      return data.map(msg => ({
        id: msg.id,
        user_id: msg.user_id,
        username: msg.profile?.username || 'Unknown',
        message: msg.message,
        team_type: msg.team_type,
        timestamp: msg.created_at
      }));
    } catch (error) {
      console.error('Error loading chat messages:', error);
      return [];
    }
  };

  // Add system log entry
  const addSystemLog = async (operationId: string, level: string, message: string, source: string) => {
    if (!tablesExist) return;
    
    try {
      const { error } = await supabase
        .from('operation_logs')
        .insert({
          operation_id: operationId,
          level,
          message,
          source
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding system log:', error);
    }
  };

  // Get system logs for operation
  const getSystemLogs = async (operationId: string) => {
    if (!tablesExist) return [];
    
    try {
      const { data, error } = await supabase
        .from('operation_logs')
        .select('*')
        .eq('operation_id', operationId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error loading system logs:', error);
      return [];
    }
  };

  return {
    availableLabs,
    pendingRequests,
    activeOperations,
    operationEvents,
    loading,
    tablesExist,
    refreshData,
    createOperationRequest,
    acceptOperationRequest,
    submitFlag,
    blockAttack,
    endOperation,
    getUserOperations,
    getAvailableOperations,
    addChatMessage,
    getOperationChat,
    addSystemLog,
    getSystemLogs,
    // Legacy compatibility
    joinOperation: async (operationId: string) => operationId
  };
};