import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { colors, spacing, radius, typography } from '../lib/theme';
import { getChatMessages, sendChatMessage, ChatMessage } from '../services/chat';
import { useAuth } from '../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const { user } = useAuth();
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

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      const msg = await sendChatMessage(content);
      setMessages(prev => [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerDot} />
        <View>
          <Text style={s.headerTitle}>Global Study Hub</Text>
          <Text style={s.headerSub}>Campus channel · Realtime coming soon</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={88}>
        {/* Messages */}
        <FlatList ref={listRef} data={messages} keyExtractor={(m, i) => m.id || String(i)}
          contentContainerStyle={{ padding: spacing.md, gap: 8 }}
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
        <View style={s.inputRow}>
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

const s = StyleSheet.create({
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
