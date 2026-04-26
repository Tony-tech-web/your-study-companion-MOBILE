import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Modal, Switch, ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography } from '../lib/theme';
import { callEdgeFunction } from '../lib/supabase';
import { getAIConversations, saveAIConversation, clearAIConversations, AIConversationEntry } from '../services/ai';

const cleanText = (t: string) => t.replace(/\{\{[^}]+\}\}/g, '').replace(/\*\*/g, '').trim();

const MODELS = [
  { id: 'google', label: 'Gemini Flash', sub: 'Fast & free' },
  { id: 'google-pro', label: 'Gemini Pro', sub: 'More capable' },
  { id: 'openrouter', label: 'GPT-4o', sub: 'OpenRouter credits' },
];

type Mode = 'chat' | 'teach' | 'test';

const MessageBubble = ({ msg }: { msg: AIConversationEntry }) => {
  const isUser = msg.role === 'user';
  return (
    <View style={[s.msgRow, isUser && s.msgRowUser]}>
      <View style={[s.avatar, isUser ? s.avatarUser : s.avatarAI]}>
        <Text style={s.avatarText}>{isUser ? 'U' : '✨'}</Text>
      </View>
      <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAI]}>
        <Text style={[s.bubbleText, isUser && s.bubbleTextUser]}>{msg.content}</Text>
      </View>
    </View>
  );
};

export default function AIScreen() {
  const [messages, setMessages] = useState<AIConversationEntry[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [streaming, setStreaming] = useState('');
  const flatRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  // New UI State
  const [model, setModel] = useState('google');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [autoSwitch, setAutoSwitch] = useState(true);
  const [mode, setMode] = useState<Mode>('chat');
  const [libraryActive, setLibraryActive] = useState(false);
  const [studyToolsActive, setStudyToolsActive] = useState(false);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    try {
      const h = await getAIConversations();
      setMessages(h.length === 0 ? [{
        id: 'init', role: 'assistant',
        content: "Neural link established. I'm Orbit, your academic AI. How can I help?",
        created_at: new Date().toISOString(),
      }] : h);
    } catch (e) { console.error(e); }
    finally { setFetching(false); }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput(''); setLoading(true); setStreaming('');
    try {
      const userMsg = await saveAIConversation('user', text);
      setMessages(prev => [...prev, userMsg]);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);

      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const res = await callEdgeFunction('ai-chat', {
        messages: [...history, { role: 'user', content: text }],
        providerId: model,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'AI request failed');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value, { stream: true }).split('\n')) {
            if (line.startsWith('data: ') && !line.includes('[DONE]')) {
              try {
                const delta = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content || '';
                full += delta;
                setStreaming(cleanText(full));
              } catch { /* skip */ }
            }
          }
        }
      }

      const final = cleanText(full) || 'No response received.';
      setStreaming('');
      const aiMsg = await saveAIConversation('assistant', final);
      setMessages(prev => [...prev, aiMsg]);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      setStreaming('');
      const errMsg = await saveAIConversation('assistant', `Error: ${e.message}`).catch(() => ({
        id: Date.now().toString(), role: 'assistant' as const,
        content: `Error: ${e.message}`, created_at: new Date().toISOString(),
      }));
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    Alert.alert('Clear History', 'Delete all conversation history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive', onPress: async () => {
          await clearAIConversations();
          setMessages([{ id: 'init', role: 'assistant', content: 'Logs cleared. Orbit ready.', created_at: new Date().toISOString() }]);
        }
      }
    ]);
  };

  const currentModelLabel = MODELS.find(m => m.id === model)?.label || 'Model';

  if (fetching) return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      
      {/* Model Picker Modal */}
      <Modal visible={showModelPicker} transparent animationType="fade" onRequestClose={() => setShowModelPicker(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowModelPicker(false)}>
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            <View style={s.modalRow}>
              <View>
                <Text style={s.modalTitle}>Auto Switch</Text>
                <Text style={s.modalSub}>Best available provider</Text>
              </View>
              <Switch value={autoSwitch} onValueChange={setAutoSwitch} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
            </View>
            <View style={s.modalDivider} />
            <Text style={s.modalLabel}>SELECT MODEL</Text>
            {MODELS.map(m => (
              <TouchableOpacity key={m.id} style={s.modelOption} onPress={() => { setModel(m.id); setShowModelPicker(false); }}>
                <View>
                  <Text style={[s.modelOptionLabel, model === m.id && { color: colors.primary }]}>{m.label}</Text>
                  <Text style={s.modelOptionSub}>{m.sub}</Text>
                </View>
                {model === m.id && <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <View>
          <Text style={s.title}>Orbit AI</Text>
          <View style={s.statusRow}>
            <View style={s.statusDot} />
            <Text style={s.statusText}>NEURAL LINK ACTIVE</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.modelPill} onPress={() => setShowModelPicker(true)}>
            <Text style={s.modelPillText}>{currentModelLabel}</Text>
            <Text style={s.modelPillChevron}>⌄</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.clearBtn} onPress={handleClear}>
            <Text style={s.clearBtnText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={({ item }) => <MessageBubble msg={item} />}
        contentContainerStyle={s.list}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        ListFooterComponent={
          <>
            {streaming ? (
              <View style={s.msgRow}>
                <View style={[s.avatar, s.avatarAI]}><Text style={s.avatarText}>✨</Text></View>
                <View style={[s.bubble, s.bubbleAI, s.bubbleStreaming]}>
                  <Text style={s.bubbleText}>{streaming}</Text>
                  <Text style={s.cursor}>▋</Text>
                </View>
              </View>
            ) : loading ? (
              <View style={s.msgRow}>
                <View style={[s.avatar, s.avatarAI]}><Text style={s.avatarText}>✨</Text></View>
                <View style={[s.bubble, s.bubbleAI]}>
                  <ActivityIndicator color={colors.primary} size="small" />
                </View>
              </View>
            ) : null}
          </>
        }
      />

      {/* Input Area */}
      <View style={[s.inputContainer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        
        {/* Context Chips */}
        {libraryActive && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.contextArea} contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.md }}>
            <View style={s.contextChip}>
              <Text style={s.contextChipIcon}>📄</Text>
              <Text style={s.contextChipText} numberOfLines={1}>CSC 303 NOTE.pdf</Text>
              <TouchableOpacity style={s.contextChipClose}><Text style={s.contextChipCloseText}>✕</Text></TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* Action Bar */}
        <View style={s.actionBar}>
          <View style={s.actionLeft}>
            <TouchableOpacity style={[s.actionBtn, mode === 'chat' && s.actionBtnActive]} onPress={() => setMode('chat')}>
              <Text style={[s.actionBtnText, mode === 'chat' && s.actionBtnTextActive]}>✨ Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, mode === 'teach' && s.actionBtnActive]} onPress={() => setMode('teach')}>
              <Text style={[s.actionBtnText, mode === 'teach' && s.actionBtnTextActive]}>🧠 Teach</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, mode === 'test' && s.actionBtnActive]} onPress={() => setMode('test')}>
              <Text style={[s.actionBtnText, mode === 'test' && s.actionBtnTextActive]}>🧪 Test</Text>
            </TouchableOpacity>
          </View>
          <View style={s.actionRight}>
            <TouchableOpacity style={[s.actionBtn, libraryActive && s.actionBtnActiveDark]} onPress={() => setLibraryActive(!libraryActive)}>
              <Text style={[s.actionBtnText, libraryActive && s.actionBtnTextActive]}>📖 Library</Text>
              {libraryActive && <View style={s.badge}><Text style={s.badgeText}>1</Text></View>}
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, studyToolsActive && s.actionBtnActiveDark]} onPress={() => setStudyToolsActive(!studyToolsActive)}>
              <Text style={[s.actionBtnText, studyToolsActive && s.actionBtnTextActive]}>🧰 Study Tools</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Input */}
        <View style={s.inputWrapper}>
          <TextInput
            style={s.input} value={input} onChangeText={setInput}
            placeholder={mode === 'chat' ? "Ask Orbit anything..." : mode === 'teach' ? "What should I explain from your PDFs?" : "Ready? I'll quiz you on your material."}
            placeholderTextColor={colors.muted}
            multiline maxLength={2000}
            onSubmitEditing={handleSend} returnKeyType="send"
          />
          <TouchableOpacity style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]} onPress={handleSend} disabled={!input.trim() || loading}>
            <Text style={s.sendBtnText}>➤</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={s.footerText}>Powered by Supabase Edge · OpenRouter</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background },
  title: { color: colors.foreground, fontSize: typography.xl, fontWeight: '800' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  statusText: { color: colors.muted, fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  headerRight: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  modelPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.03)' },
  modelPillText: { color: colors.muted, fontSize: typography.sm, fontWeight: '600' },
  modelPillChevron: { color: colors.muted, fontSize: 14, marginTop: -2 },
  clearBtn: { width: 32, height: 32, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  clearBtnText: { fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 90, paddingRight: spacing.md },
  modalContent: { width: 260, backgroundColor: '#141414', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: colors.foreground, fontSize: typography.sm, fontWeight: '700' },
  modalSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  modalDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  modalLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm },
  modelOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  modelOptionLabel: { color: colors.foreground, fontSize: typography.sm, fontWeight: '600' },
  modelOptionSub: { color: colors.muted, fontSize: 11, marginTop: 2 },

  // Messages
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  msgRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  msgRowUser: { flexDirection: 'row-reverse' },
  avatar: { width: 32, height: 32, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  avatarUser: { backgroundColor: colors.primary },
  avatarAI: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  avatarText: { color: '#fff', fontSize: typography.xs, fontWeight: '800' },
  bubble: { flex: 1, borderRadius: radius.lg, padding: spacing.md, maxWidth: '85%' },
  bubbleUser: { backgroundColor: colors.primary, borderTopRightRadius: 4 },
  bubbleAI: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderTopLeftRadius: 4 },
  bubbleStreaming: { borderColor: colors.primary },
  bubbleText: { color: colors.foreground, fontSize: typography.sm, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  cursor: { color: colors.primary },

  // Input Area
  inputContainer: { backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  contextArea: { paddingBottom: spacing.sm },
  contextChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 6, gap: 6, maxWidth: 200 },
  contextChipIcon: { fontSize: 12 },
  contextChipText: { color: colors.foreground, fontSize: 12, fontWeight: '600', flexShrink: 1 },
  contextChipClose: { marginLeft: 4 },
  contextChipCloseText: { color: colors.muted, fontSize: 10 },

  actionBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  actionLeft: { flexDirection: 'row', gap: spacing.sm },
  actionRight: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  actionBtnActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  actionBtnActiveDark: { backgroundColor: colors.card, borderColor: colors.muted },
  actionBtnText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  actionBtnTextActive: { color: colors.primary },
  badge: { backgroundColor: colors.primary, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  input: {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    color: colors.foreground, fontSize: typography.sm, maxHeight: 120,
    borderWidth: 1, borderColor: colors.border,
  },
  sendBtn: { width: 44, height: 44, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.3 },
  sendBtnText: { color: colors.primary, fontSize: typography.lg, fontWeight: '800', transform: [{ rotate: '-45deg' }], marginLeft: 2, marginTop: 2 },
  
  footerText: { textAlign: 'center', color: colors.muted, fontSize: 10, opacity: 0.6, marginTop: 4 },
});
