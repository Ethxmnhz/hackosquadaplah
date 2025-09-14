import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

const LabInterfacePage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const teamParam = searchParams.get('team');
  const ai = searchParams.get('ai');
  const sessionId = searchParams.get('session');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lab, setLab] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partnerLeft, setPartnerLeft] = useState(false);
  // Chat and event feed
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [eventFeed, setEventFeed] = useState<string[]>([]);
  // Timer
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch chat messages (real-time)
  useEffect(() => {
    if (!sessionId) return;
    let subscription: any = null;
    const fetchChat = async () => {
      const { data, error } = await supabase
        .from('lab_session_chat')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      if (!error) setChatMessages(data || []);
    };
    fetchChat();
    // Subscribe to new chat messages
    subscription = supabase
      .channel('lab_session_chat:' + sessionId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lab_session_chat', filter: `session_id=eq.${sessionId}` }, payload => {
        setChatMessages(prev => [...prev, payload.new]);
      })
      .subscribe();
    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [sessionId]);

  // Send chat message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !sessionId) return;
    await supabase.from('lab_session_chat').insert({
      session_id: sessionId,
      user_id: user.id,
      username: user.email,
      message: newMessage.trim()
    });
