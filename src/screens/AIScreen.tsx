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
import { Document } from '../types';

import LibraryPanel from '../components/AI/LibraryPanel';
import StudyToolsPanel from '../components/AI/StudyToolsPanel';

const cleanText = (t: string) => t.replace(/\\{\\{[^}]+\\}\\}/g, '').replace(/\\*\\*/g, '').trim();

const MODELS = [
  { id: 'google', label: 'Gemini Flash', sub: 'Fast & free' },
  { id: 'google-pro', label: 'Gemini Pro', sub: 'More capable' },
  { id: 'openrouter', label: 'GPT-4o', sub: 'OpenRouter credits' },
];

type Mode = 'chat' | 'teach' | 'test';
type ActiveSession = 'none' | 'teach' | 'test';

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

  // Settings
  const [model, setModel] = useState('google');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [autoSwitch, setAutoSwitch] = useState(true);
  const [mode, setMode] = useState<Mode>('chat');
  
  // Library Context State
  const [libraryActive, setLibraryActive] = useState(false);
  const [pdfContext, setPdfContext] = useState('');
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [activeDocs, setActiveDocs] = useState<Document[]>([]);

  // Study Tools State
  const [studyToolsActive, setStudyToolsActive] = useState(false);

  // Teach / Test Session State
  const [activeSession, setActiveSession] = useState<ActiveSession>('none');
  const [teachSession, setTeachSession] = useState({ currentPage: 1, totalPages: 1, chunkSize: 5 });

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

  const handleSend = async (overrideText?: string) => {
    const text = overrideText || input.trim();
    if (!text || loading) return;
    
    if (!overrideText) setInput(''); 
    setLoading(true); setStreaming('');
    
    try {
      const userMsg = await saveAIConversation('user', text);
      setMessages(prev => [...prev, userMsg]);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);

      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      
      // Handle Teach mode context chunking
      let currentPdfContext = pdfContext;
      let scanProgress = undefined;

      if (activeSession === 'teach' && pdfPages.length > 0) {
        const start = teachSession.currentPage - 1;
        const end = Math.min(start + teachSession.chunkSize, teachSession.totalPages);
        currentPdfContext = pdfPages.slice(start, end).join('\\n\\n');
        scanProgress = { current: end, total: teachSession.totalPages };
      }

      const res = await callEdgeFunction('ai-chat', {
        messages: [...history, { role: 'user', content: text }],
        providerId: model,
        mode: activeSession !== 'none' ? activeSession : 'chat',
        pdfContext: currentPdfContext,
        scanProgress,
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
          for (const line of decoder.decode(value, { stream: true }).split('\\n')) {
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

  const advanceTeachSession = () => {
    const nextStart = teachSession.currentPage + teachSession.chunkSize;
    if (nextStart > teachSession.totalPages) {
      handleEndSession();
      return;
    }
    setTeachSession(prev => ({ ...prev, currentPage: nextStart }));
    handleSend(`Please continue teaching me from page ${nextStart}.`);
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

  const handleEndSession = () => {
    setActiveSession('none');
    setMode('chat');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Session ended. Back to normal chat.', created_at: new Date().toISOString() }]);
  };

  const startSession = (type: ActiveSession) => {
    if (!pdfContext) {
      Alert.alert('No Document Context', 'Please open the Library panel and select a document first.');
      return;
    }
    
    setActiveSession(type);
    setMode(type);
    
    if (type === 'teach') {
      setTeachSession({ currentPage: 1, totalPages: pdfPages.length || 1, chunkSize: 5 });
      handleSend(`Please teach me this material starting from page 1.`);
    } else if (type === 'test') {
      handleSend(`Please test me on the provided material.`);
    }
  };

  const handleModeSelect = (newMode: Mode) => {
    if (activeSession !== 'none' && newMode !== activeSession && newMode !== 'chat') {
      Alert.alert('Active Session', 'You must end your current session to switch modes.');
      return;
    }
    
    if (newMode === 'teach' || newMode === 'test') {
      if (activeSession === 'none') {
        startSession(newMode);
      } else {
        setMode(newMode);
      }
    } else {
      setMode('chat');
    }
  };

  const currentModelLabel = MODELS.find(m => m.id === model)?.label || 'Model';

  if (fetching) return (
    <View style={s.root}>
      <View style={{ padding: 20, gap: 14 }}>
        <View style={{ gap: 6 }}>
          <View style={{ width: 80, height: 18, borderRadius: 6, backgroundColor: colors.border, opacity: 0.5 }} />
          <View style={{ width: 120, height: 10, borderRadius: 4, backgroundColor: colors.border, opacity: 0.3 }} />
        </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.border, opacity: 0.35 }} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ width: '60%', height: 12, borderRadius: 4, backgroundColor: colors.border, opacity: 0.4 }} />
              <View style={{ width: '40%', height: 10, borderRadius: 4, backgroundColor: colors.border, opacity: 0.25 }} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.border, opacity: 0.35 }} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ width: '60%', height: 12, borderRadius: 4, backgroundColor: colors.border, opacity: 0.4 }} />
              <View style={{ width: '40%', height: 10, borderRadius: 4, backgroundColor: colors.border, opacity: 0.25 }} />
            </View>
          </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      
      {/* Side Panels */}
      <LibraryPanel 
        visible={libraryActive} 
        onClose={() => setLibraryActive(false)} 
        onPdfsExtracted={(text, pages, docs) => {
          setPdfContext(text);
          setPdfPages(pages);
          setActiveDocs(docs);
        }}
      />
      <StudyToolsPanel 
        visible={studyToolsActive} 
        onClose={() => setStudyToolsActive(false)} 
        pdfContext={pdfContext} 
      />

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
            {activeSession !== 'none' ? (
              <>
                <View style={[s.statusDot, { backgroundColor: activeSession === 'teach' ? colors.primary : colors.green }]} />
                <Text style={[s.statusText, { color: activeSession === 'teach' ? colors.primary : colors.green }]}>
                  {activeSession === 'teach' ? 'TEACHING SESSION' : 'TESTING SESSION'}
                </Text>
              </>
            ) : (
              <>
                <View style={s.statusDot} />
                <Text style={s.statusText}>NEURAL LINK ACTIVE</Text>
              </>
            )}
          </View>
        </View>
        <View style={s.headerRight}>
          {activeSession !== 'none' ? (
            <TouchableOpacity style={s.endSessionBtn} onPress={handleEndSession}>
              <Text style={s.endSessionText}>End Session</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={s.modelPill} onPress={() => setShowModelPicker(true)}>
                <Text style={s.modelPillText}>{currentModelLabel}</Text>
                <Text style={s.modelPillChevron}>⌄</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.clearBtn} onPress={handleClear}>
                <Text style={s.clearBtnText}>🗑️</Text>
              </TouchableOpacity>
            </>
          )}
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
            
            {/* Teach Session Controls */}
            {activeSession === 'teach' && !loading && !streaming && (
              <View style={s.teachControls}>
                <Text style={s.teachProgressText}>
                  Progress: Page {teachSession.currentPage} to {Math.min(teachSession.currentPage + teachSession.chunkSize - 1, teachSession.totalPages)} of {teachSession.totalPages}
                </Text>
                <TouchableOpacity style={s.teachAdvanceBtn} onPress={advanceTeachSession}>
                  <Text style={s.teachAdvanceBtnText}>
                    {teachSession.currentPage + teachSession.chunkSize > teachSession.totalPages ? 'Finish Session' : 'Proceed to Next Pages'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        }
      />

      {/* Input Area */}
      <View style={[s.inputContainer, { paddingBottom: Math.max(insets.bottom + 90, 110) }]}>
        
        {/* Context Chips */}
        {activeDocs.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.contextArea} contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.md }}>
            {activeDocs.map(doc => (
              <View key={doc.id} style={s.contextChip}>
                <Text style={s.contextChipIcon}>📄</Text>
                <Text style={s.contextChipText} numberOfLines={1}>{doc.name}</Text>
                <TouchableOpacity style={s.contextChipClose} onPress={() => {
                  const newDocs = activeDocs.filter(d => d.id !== doc.id);
                  setActiveDocs(newDocs);
                  if (newDocs.length === 0) setPdfContext('');
                }}>
                  <Text style={s.contextChipCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Action Bar */}
        <View style={s.actionBar}>
          <View style={s.actionLeft}>
            <TouchableOpacity style={[s.actionBtn, mode === 'chat' && s.actionBtnActive]} onPress={() => handleModeSelect('chat')}>
              <Text style={[s.actionBtnText, mode === 'chat' && s.actionBtnTextActive]}>✨ Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, mode === 'teach' && s.actionBtnActive, activeSession === 'teach' && { borderColor: colors.primary }]} onPress={() => handleModeSelect('teach')}>
              <Text style={[s.actionBtnText, mode === 'teach' && s.actionBtnTextActive]}>🧠 Teach</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, mode === 'test' && s.actionBtnActive, activeSession === 'test' && { borderColor: colors.green }]} onPress={() => handleModeSelect('test')}>
              <Text style={[s.actionBtnText, mode === 'test' && s.actionBtnTextActive, activeSession === 'test' && { color: colors.green }]}>🧪 Test</Text>
            </TouchableOpacity>
          </View>
          <View style={s.actionRight}>
            <TouchableOpacity style={[s.actionBtn, pdfContext.length > 0 && s.actionBtnActiveDark]} onPress={() => setLibraryActive(true)}>
              <Text style={[s.actionBtnText, pdfContext.length > 0 && s.actionBtnTextActive]}>📖 Library</Text>
              {pdfContext.length > 0 && <View style={s.badge}><Text style={s.badgeText}>{activeDocs.length}</Text></View>}
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn]} onPress={() => setStudyToolsActive(true)}>
              <Text style={[s.actionBtnText]}>🧰 Study Tools</Text>
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
            onSubmitEditing={() => handleSend()} returnKeyType="send"
          />
          <TouchableOpacity style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]} onPress={() => handleSend()} disabled={!input.trim() || loading}>
            <Text style={s.sendBtnText}>➤</Text>
          </TouchableOpacity>
        </View>
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
  endSessionBtn: { backgroundColor: colors.red + '20', borderWidth: 1, borderColor: colors.red, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full },
  endSessionText: { color: colors.red, fontSize: typography.xs, fontWeight: '700' },

  // Modals
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

  teachControls: { alignItems: 'center', marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  teachProgressText: { color: colors.muted, fontSize: typography.sm, fontWeight: '600', marginBottom: spacing.sm },
  teachAdvanceBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full },
  teachAdvanceBtnText: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },

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
});
