import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Modal, ScrollView,
} from 'react-native';
import { colors, spacing, radius, typography } from '../lib/theme';
import { callEdgeFunction, supabase } from '../lib/supabase';
import { getAIConversations, saveAIConversation, clearAIConversations, AIConversationEntry } from '../services/ai';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import * as FileSystem from 'expo-file-system';
import Svg, { Path } from 'react-native-svg';

const cleanText = (t: string) => t.replace(/\{\{[^}]+\}\}/g, '').replace(/\*\*/g, '').trim();

type ChatMode = 'chat' | 'teach' | 'test';

interface StudentPdf {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
}

interface PdfState {
  pdfId: string;
  fileName: string;
  base64?: string;
  pageCount?: number;
  status: 'idle' | 'downloading' | 'ready' | 'error';
  error?: string;
}

const ModeIcon = ({ mode, color, size = 18 }: { mode: ChatMode; color: string; size?: number }) => {
  const paths: Record<ChatMode, string> = {
    chat:  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    teach: 'M12 2a10 10 0 110 20A10 10 0 0112 2zm0 5v5l4 2',
    test:  'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v11m0 0H5a2 2 0 00-2-2V9m6 5h10a2 2 0 002-2V9m-6 5v5m0 0H9m6 0h4',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={paths[mode]} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

// ─── PDF Library Bottom Sheet ──────────────────────────────────────────────
const PdfLibrarySheet = ({
  visible, mode, pdfs, pdfStates,
  onClose, onDownload, onStart,
}: {
  visible: boolean;
  mode: 'teach' | 'test';
  pdfs: StudentPdf[];
  pdfStates: PdfState[];
  onClose: () => void;
  onDownload: (pdf: StudentPdf) => void;
  onStart: (selectedIds: string[]) => void;
}) => {
  const [selected, setSelected] = useState<string[]>([]);
  const accentColor = mode === 'teach' ? '#6366f1' : '#10b981';

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      // Auto-download when selected
      if (!prev.includes(id)) {
        const pdf = pdfs.find(p => p.id === id);
        const state = pdfStates.find(s => s.pdfId === id);
        if (pdf && state?.status === 'idle') onDownload(pdf);
      }
      return next;
    });
  };

  const readyCount = selected.filter(id => pdfStates.find(s => s.pdfId === id)?.status === 'ready').length;

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={sh.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={sh.sheet}>
          {/* Handle bar */}
          <View style={sh.handle} />

          {/* Header */}
          <View style={sh.header}>
            <View style={[sh.modeIcon, { backgroundColor: accentColor + '18' }]}>
              <ModeIcon mode={mode} color={accentColor} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={sh.title}>{mode === 'teach' ? 'Teach Mode' : 'Test Mode'}</Text>
              <Text style={sh.sub}>Select PDFs for Orbit to {mode === 'teach' ? 'teach you from' : 'quiz you on'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={sh.closeBtn}>
              <Text style={sh.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* PDF list */}
          <ScrollView style={sh.pdfList} showsVerticalScrollIndicator={false}>
            {pdfs.length === 0 ? (
              <View style={sh.emptyList}>
                <Text style={sh.emptyText}>No PDFs in your library.</Text>
                <Text style={sh.emptySubText}>Upload from the Courses tab first.</Text>
              </View>
            ) : pdfs.map(pdf => {
              const state = pdfStates.find(s => s.pdfId === pdf.id);
              const isSelected = selected.includes(pdf.id);
              const status = state?.status || 'idle';

              return (
                <TouchableOpacity key={pdf.id} onPress={() => toggle(pdf.id)}
                  style={[sh.pdfRow, isSelected && { borderColor: accentColor, borderWidth: 1.5 }]}>
                  {/* Checkbox */}
                  <View style={[sh.checkbox, isSelected && { backgroundColor: accentColor, borderColor: accentColor }]}>
                    {isSelected && <Text style={sh.checkmark}>✓</Text>}
                  </View>

                  {/* PDF icon */}
                  <View style={sh.pdfIconWrap}>
                    <Text style={sh.pdfIconText}>PDF</Text>
                  </View>

                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <Text style={sh.pdfName} numberOfLines={1}>{pdf.file_name}</Text>

                    {status === 'idle' && (
                      <Text style={sh.pdfStatus}>Tap to select</Text>
                    )}
                    {status === 'downloading' && (
                      <View style={sh.progressRow}>
                        <View style={sh.progressTrack}>
                          <View style={[sh.progressFill, { width: '60%', backgroundColor: accentColor }]} />
                        </View>
                        <Text style={[sh.pdfStatus, { color: accentColor }]}>Loading...</Text>
                      </View>
                    )}
                    {status === 'ready' && state?.pageCount && state.pageCount > 0 && (
                      <Text style={[sh.pdfStatus, { color: colors.green }]}>
                        {state.pageCount} pages — ready
                      </Text>
                    )}
                    {status === 'ready' && (!state?.pageCount || state.pageCount === 0) && (
                      <Text style={[sh.pdfStatus, { color: colors.green }]}>Ready for AI</Text>
                    )}
                    {status === 'error' && (
                      <Text style={[sh.pdfStatus, { color: colors.red }]} numberOfLines={1}>
                        {state?.error || 'Load failed'}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Start button */}
          <View style={sh.footer}>
            <TouchableOpacity
              onPress={() => { onClose(); onStart(selected); }}
              disabled={selected.length === 0}
              style={[sh.startBtn, { backgroundColor: accentColor, opacity: selected.length === 0 ? 0.35 : 1 }]}>
              <ModeIcon mode={mode} color="#fff" size={18} />
              <Text style={sh.startBtnText}>
                {mode === 'teach'
                  ? `Start Teaching (${selected.length} PDF${selected.length !== 1 ? 's' : ''})`
                  : `Start Test (${selected.length} PDF${selected.length !== 1 ? 's' : ''})`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={sh.cancelBtn}>
              <Text style={sh.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const sh = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40, maxHeight: '80%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modeIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.foreground, fontSize: 15, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.input, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  pdfList: { paddingHorizontal: 16, paddingTop: 12, maxHeight: 300 },
  emptyList: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  emptySubText: { color: colors.muted, fontSize: 12, marginTop: 4 },
  pdfRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '900' },
  pdfIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#ef4444' + '18', borderWidth: 1, borderColor: '#ef4444' + '30', alignItems: 'center', justifyContent: 'center' },
  pdfIconText: { color: '#ef4444', fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
  pdfName: { color: colors.foreground, fontSize: 13, fontWeight: '600' },
  pdfStatus: { color: colors.muted, fontSize: 11, marginTop: 3 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  progressTrack: { flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  footer: { padding: 16, gap: 8 },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 20, },
  startBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  cancelBtn: { height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.input },
  cancelBtnText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
});

// ─── Session End Confirm ───────────────────────────────────────────────────
const EndSessionModal = ({ visible, mode, onEnd, onContinue }: { visible: boolean; mode: ChatMode; onEnd: () => void; onContinue: () => void }) => {
  const accentColor = mode === 'teach' ? '#6366f1' : '#10b981';
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={em.overlay}>
        <View style={em.card}>
          <View style={[em.icon, { backgroundColor: accentColor + '18' }]}>
            <ModeIcon mode={mode} color={accentColor} size={28} />
          </View>
          <Text style={em.title}>End {mode === 'teach' ? 'Teach' : 'Test'} Session?</Text>
          <Text style={em.sub}>Your progress won't be saved. Are you sure?</Text>
          <TouchableOpacity style={em.endBtn} onPress={onEnd}>
            <Text style={em.endBtnText}>End Session</Text>
          </TouchableOpacity>
          <TouchableOpacity style={em.keepBtn} onPress={onContinue}>
            <Text style={em.keepBtnText}>Keep Going</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const em = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: colors.card, borderRadius: 28, padding: 24, width: '100%', maxWidth: 320, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border },
  icon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { color: colors.foreground, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  sub: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  endBtn: { marginTop: 8, width: '100%', height: 50, borderRadius: 18, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  endBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  keepBtn: { width: '100%', height: 44, borderRadius: 16, backgroundColor: colors.input, alignItems: 'center', justifyContent: 'center' },
  keepBtnText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
});

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function AIScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIConversationEntry[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [streaming, setStreaming] = useState('');
  const [mode, setMode] = useState<ChatMode>('chat');
  const [pdfs, setPdfs] = useState<StudentPdf[]>([]);
  const [pdfStates, setPdfStates] = useState<PdfState[]>([]);
  const [selectedPdfIds, setSelectedPdfIds] = useState<string[]>([]);
  const [showLibrary, setShowLibrary] = useState<'teach' | 'test' | null>(null);
  const [showEndSession, setShowEndSession] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => { loadHistory(); fetchPdfs(); }, []);

  const loadHistory = async () => {
    try {
      const h = await getAIConversations();
      setMessages(h.length === 0 ? [{
        id: 'init', role: 'assistant',
        content: "Neural Link active. I'm Orbit.\n\nTap Chat to talk freely, Teach for guided learning from your PDFs, or Test to quiz yourself.",
        created_at: new Date().toISOString(),
      }] : h);
    } catch (e) { console.error(e); }
    finally { setFetching(false); }
  };

  const fetchPdfs = async () => {
    try {
      const res = await api.get('/api/pdfs');
      const list: StudentPdf[] = res.data;
      setPdfs(list);
      setPdfStates(list.map(p => ({ pdfId: p.id, fileName: p.file_name, status: 'idle' })));
    } catch { /* silent */ }
  };

  // Download PDF from Supabase storage → base64 for Gemini
  const downloadPdf = async (pdf: StudentPdf) => {
    setPdfStates(prev => prev.map(s => s.pdfId === pdf.id ? { ...s, status: 'downloading' } : s));
    try {
      const { data, error } = await supabase.storage.from('student-pdfs').createSignedUrl(pdf.file_path, 3600);
      if (error || !data?.signedUrl) throw new Error('Could not access PDF');

      const tempPath = `${FileSystem.cacheDirectory}orbit_${pdf.id}.pdf`;
      await FileSystem.downloadAsync(data.signedUrl, tempPath);
      const base64 = await FileSystem.readAsStringAsync(tempPath, { encoding: FileSystem.EncodingType.Base64 });

      // Try to extract page count from PDF binary header
      let pageCount = 0;
      try {
        const header = atob(base64.slice(0, 8000));
        const match = header.match(/\/Count\s+(\d+)/);
        if (match) pageCount = parseInt(match[1]);
      } catch { /* ignore */ }

      setPdfStates(prev => prev.map(s =>
        s.pdfId === pdf.id ? { ...s, base64, pageCount, status: 'ready' } : s
      ));
    } catch (err: any) {
      setPdfStates(prev => prev.map(s =>
        s.pdfId === pdf.id ? { ...s, status: 'error', error: err.message || 'Download failed' } : s
      ));
    }
  };

  const sendToAI = async (text: string, overrideMode?: ChatMode, pdfDocs?: Array<{base64: string; fileName: string}>) => {
    if (!text.trim() || loading) return;
    setLoading(true); setStreaming('');
    try {
      const userMsg = await saveAIConversation('user', text);
      setMessages(prev => [...prev, userMsg]);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);

      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));

      const res = await callEdgeFunction('ai-chat', {
        messages: [...history, { role: 'user', content: text }],
        providerId: 'auto',
        mode: overrideMode ?? mode,
        ...(pdfDocs && pdfDocs.length > 0 ? { pdfDocuments: pdfDocs } : {}),
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
      const errMsg = `Error: ${e.message}`;
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: errMsg, created_at: new Date().toISOString() }]);
    } finally { setLoading(false); }
  };

  const startSession = async (sessionMode: 'teach' | 'test', selectedIds: string[]) => {
    setMode(sessionMode);
    setSelectedPdfIds(selectedIds);
    // Get ready PDFs (base64 docs for Gemini)
    const pdfDocs = pdfStates
      .filter(s => selectedIds.includes(s.pdfId) && s.status === 'ready' && s.base64)
      .map(s => ({ base64: s.base64!, fileName: s.fileName }));

    const prompt = sessionMode === 'teach'
      ? `Please teach me the content of the provided PDF document(s) step by step. Start with an overview, then explain each key concept clearly. I'll ask questions as we go.`
      : `Please quiz me on the content of the provided PDF document(s). Ask me questions one at a time, wait for my answer, then give feedback before moving to the next question.`;

    await sendToAI(prompt, sessionMode, pdfDocs.length > 0 ? pdfDocs : undefined);
  };

  const endSession = () => {
    setMode('chat');
    setSelectedPdfIds([]);
    setShowEndSession(false);
    setMessages(prev => [...prev, {
      id: Date.now().toString(), role: 'assistant',
      content: 'Session ended. Back to Chat mode.',
      created_at: new Date().toISOString(),
    }]);
  };

  const handleSend = () => sendToAI(input.trim()).then(() => setInput(''));

  const handleModePress = (pressed: ChatMode) => {
    if (pressed === 'chat') {
      if (mode !== 'chat') setShowEndSession(true);
    } else {
      setShowLibrary(pressed as 'teach' | 'test');
    }
  };

  const handleClear = () => {
    Alert.alert('Clear History', 'Delete all conversation history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        await clearAIConversations();
        setMessages([{ id: 'init', role: 'assistant', content: 'Logs cleared. Orbit ready.', created_at: new Date().toISOString() }]);
      }},
    ]);
  };

  if (fetching) return (
    <View style={s.root}>
      <View style={{ padding: 20, gap: 14 }}>
        {[0,1,2,3].map(i => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: colors.border, opacity: 0.4 }} />
            <View style={{ width: i % 2 === 0 ? '65%' : '45%', height: 60, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }} />
          </View>
        ))}
      </View>
    </View>
  );

  const modeColor: Record<ChatMode, string> = { chat: colors.primary, teach: '#6366f1', test: '#10b981' };

  return (
    <View style={s.root}>
      {/* PDF Library Sheet */}
      {showLibrary && (
        <PdfLibrarySheet
          visible={!!showLibrary}
          mode={showLibrary}
          pdfs={pdfs}
          pdfStates={pdfStates}
          onClose={() => setShowLibrary(null)}
          onDownload={downloadPdf}
          onStart={ids => startSession(showLibrary, ids)}
        />
      )}

      {/* End Session Modal */}
      <EndSessionModal
        visible={showEndSession}
        mode={mode}
        onEnd={endSession}
        onContinue={() => setShowEndSession(false)}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Orbit AI</Text>
            <View style={s.statusRow}>
              <View style={[s.statusDot, { backgroundColor: mode !== 'chat' ? modeColor[mode] : colors.green }]} />
              <Text style={s.statusText}>
                {mode === 'chat' ? 'Neural Link Active'
                  : mode === 'teach' ? 'Teaching Session'
                  : 'Test Session'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={s.clearBtn} onPress={handleClear}>
            <Text style={s.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m, i) => m.id || String(i)}
          contentContainerStyle={s.list}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item: msg }) => {
            const isUser = msg.role === 'user';
            return (
              <View style={[s.msgRow, isUser && s.msgRowUser]}>
                <View style={[s.avatar, isUser ? s.avatarUser : s.avatarAI]}>
                  <Text style={[s.avatarText, !isUser && { color: colors.primary }]}>{isUser ? 'U' : 'O'}</Text>
                </View>
                <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAI]}>
                  <Text style={[s.bubbleText, isUser && { color: '#fff' }]}>{msg.content}</Text>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            <>
              {streaming ? (
                <View style={s.msgRow}>
                  <View style={[s.avatar, s.avatarAI]}><Text style={[s.avatarText, { color: colors.primary }]}>O</Text></View>
                  <View style={[s.bubble, s.bubbleAI, { borderColor: colors.primary + '40' }]}>
                    <Text style={s.bubbleText}>{streaming}</Text>
                    <Text style={{ color: colors.primary }}>▋</Text>
                  </View>
                </View>
              ) : loading ? (
                <View style={s.msgRow}>
                  <View style={[s.avatar, s.avatarAI]}><Text style={[s.avatarText, { color: colors.primary }]}>O</Text></View>
                  <View style={[s.bubble, s.bubbleAI]}>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {[0,1,2].map(i => <View key={i} style={[s.dot, { animationDelay: `${i * 0.15}s` }]} />)}
                    </View>
                  </View>
                </View>
              ) : null}
            </>
          }
        />

        {/* Session progress bar (teach mode) */}
        {mode !== 'chat' && selectedPdfIds.length > 0 && (
          <View style={s.sessionBar}>
            <View style={[s.sessionDot, { backgroundColor: modeColor[mode] }]} />
            <Text style={[s.sessionText, { color: modeColor[mode] }]}>
              {mode === 'teach' ? 'Teaching from' : 'Testing on'} {selectedPdfIds.length} PDF{selectedPdfIds.length !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity style={[s.endBtn, { borderColor: modeColor[mode] + '50' }]} onPress={() => setShowEndSession(true)}>
              <Text style={[s.endBtnText, { color: modeColor[mode] }]}>End</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <View style={s.inputWrap}>
          {/* Mode buttons — Chat, Teach, Test only */}
          <View style={s.modeBar}>
            {(['chat', 'teach', 'test'] as ChatMode[]).map(m => (
              <TouchableOpacity key={m} onPress={() => handleModePress(m)}
                style={[s.modeBtn, mode === m && { backgroundColor: modeColor[m] }]}>
                <ModeIcon mode={m} color={mode === m ? '#fff' : colors.muted} size={15} />
                <Text style={[s.modeBtnText, mode === m && { color: '#fff', fontWeight: '800' }]}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Text input */}
          <View style={s.inputBar}>
            <TextInput
              style={s.input} value={input} onChangeText={setInput}
              placeholder={mode === 'chat' ? 'Ask Orbit anything…' : mode === 'teach' ? 'Ask about the material…' : 'Reply to the quiz…'}
              placeholderTextColor={colors.muted} multiline maxLength={2000}
            />
            <TouchableOpacity style={[s.sendBtn, (!input.trim() || loading) && { opacity: 0.3 }]}
              onPress={handleSend} disabled={!input.trim() || loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.sendBtnText}>↑</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.card },
  title: { color: colors.foreground, fontSize: 16, fontWeight: '800' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: colors.muted, fontSize: 11, fontWeight: '500' },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  clearBtnText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  list: { padding: spacing.md, gap: 12, paddingBottom: 130 },
  msgRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  msgRowUser: { flexDirection: 'row-reverse' },
  avatar: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  avatarUser: { backgroundColor: colors.primary, borderColor: colors.primary },
  avatarAI: { backgroundColor: colors.card },
  avatarText: { fontSize: 11, fontWeight: '900', color: '#fff' },
  bubble: { flex: 1, borderRadius: 18, padding: 14, maxWidth: '80%' },
  bubbleUser: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleText: { color: colors.foreground, fontSize: 14, lineHeight: 22 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  sessionBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.card },
  sessionDot: { width: 6, height: 6, borderRadius: 3 },
  sessionText: { flex: 1, fontSize: 11, fontWeight: '600' },
  endBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  endBtnText: { fontSize: 11, fontWeight: '700' },
  inputWrap: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: Platform.OS === 'ios' ? 8 : 4 },
  modeBar: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border },
  modeBtnText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  input: { flex: 1, backgroundColor: colors.input, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10, color: colors.foreground, fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: colors.border },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
});
