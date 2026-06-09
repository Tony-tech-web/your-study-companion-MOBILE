import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { spacing, radius } from '../lib/theme';
import { getChatMessages, sendChatMessage, ChatMessage } from '../services/chat';
import { useAuth } from '../contexts/AuthContext';
import { useMobileTheme } from '../contexts/ThemeContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function ChatScreen() {
  const { user } = useAuth();
  const { colors } = useMobileTheme();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    getChatMessages()
      .then(setMessages)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const isVisibleToUser = (message: ChatMessage) =>
      !message.receiver_id || message.sender_id === user.id || message.receiver_id === user.id;

    const channel = supabase
      .channel('orbit-mobile-chat-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, payload => {
        const next = payload.new as ChatMessage | null;
        const old = payload.old as Partial<ChatMessage> | null;
        if (payload.eventType === 'DELETE' && old?.id) {
          setMessages(prev => prev.filter(item => item.id !== old.id));
          return;
        }
        if (!next || !isVisibleToUser(next)) return;
        setMessages(prev => {
          const exists = prev.some(item => item.id === next.id);
          const merged = exists ? prev.map(item => item.id === next.id ? next : item) : [...prev, next];
          return merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      const msg = await sendChatMessage(content);
      setMessages(prev => prev.some(item => item.id === msg.id) ? prev : [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 20, gap: 12 }}>
        {[0,1,2,3,4].map(i => (
          <View key={i} style={{ flexDirection: i % 2 === 0 ? 'row' : 'row-reverse', alignItems: 'flex-end', gap: 10 }}>
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: colors.border, opacity: 0.4 }} />
            <View style={{ width: i % 2 === 0 ? '65%' : '50%', height: 64, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }} />
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerDot} />
        <View>
          <Text style={s.headerTitle}>Global Study Hub</Text>
          <Text style={s.headerSub}>Campus channel · realtime active</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        {/* Messages */}
        <FlatList ref={listRef} data={messages} keyExtractor={(m, i) => m.id || String(i)}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 178, gap: 8 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>No messages yet. Start the conversation.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.sender_id === user?.id;
            return (
              <View style={[s.msgRow, isMe && s.msgRowMe]}>
                {!isMe && <View style={s.avatar}><Text style={s.avatarText}>U</Text></View>}
                <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
                  <Text style={[s.bubbleText, isMe && { color: '#fff' }]}>{item.content}</Text>
                  <Text style={[s.time, isMe && { color: 'rgba(255,255,255,0.6)', textAlign: 'right' }]}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                {isMe && <View style={[s.avatar, s.avatarMe]}><Text style={[s.avatarText, { color: '#fff' }]}>{user?.email?.slice(0,2).toUpperCase()}</Text></View>}
              </View>
            );
          }}
        />

        {/* Input */}
        <View style={[s.inputRow, { paddingBottom: Math.max(insets.bottom, 8) + 92 }]}>
          <TextInput value={input} onChangeText={setInput} placeholder="Send a message..."
            placeholderTextColor={colors.muted} style={s.input}
            onSubmitEditing={handleSend} returnKeyType="send" />
          <TouchableOpacity onPress={handleSend} disabled={sending || !input.trim()} style={[s.sendBtn, (!input.trim() || sending) && { opacity: 0.3 }]}>
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.sendIcon}>↑</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.card },
  headerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  headerTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  headerSub: { fontSize: 11, color: colors.muted, marginTop: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 13, color: colors.muted, opacity: 0.5 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowMe: { flexDirection: 'row-reverse' },
  avatar: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarMe: { backgroundColor: colors.primary, borderColor: colors.primary },
  avatarText: { fontSize: 10, fontWeight: '800', color: colors.muted },
  bubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, gap: 3 },
  bubbleThem: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: colors.foreground, lineHeight: 20 },
  time: { fontSize: 10, color: colors.muted, marginTop: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.md, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.card },
  input: { flex: 1, backgroundColor: colors.input, borderRadius: radius.xl, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: colors.foreground, borderWidth: 1, borderColor: colors.border },
  sendBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendIcon: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 22 },
});
