import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography } from '../../lib/theme';
import { callEdgeFunction } from '../../lib/supabase';

interface StudyToolsPanelProps {
  visible: boolean;
  onClose: () => void;
  pdfContext: string;
}

type ToolType = 'flashcards' | 'quiz' | 'notes' | 'summary';

export default function StudyToolsPanel({ visible, onClose, pdfContext }: StudyToolsPanelProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ToolType>('flashcards');
  const [studyFocus, setStudyFocus] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  
  // Interactive UI State
  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const [quizIdx, setQuizIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const handleGenerate = async () => {
    if (!pdfContext) {
      Alert.alert('No Context', 'Please load a PDF from the Library first.');
      return;
    }
    
    setLoading(true);
    setGeneratedContent(null);
    setFlashcardIdx(0);
    setIsFlipped(false);
    setQuizIdx(0);
    setSelectedAnswers({});
    setQuizSubmitted(false);

    try {
      const res = await callEdgeFunction('generate-study-tools', {
        pdfContent: pdfContext,
        toolType: activeTab,
        studyFocus: studyFocus.trim() || undefined,
      });
      
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Generation failed');
      
      setGeneratedContent(data.content);
    } catch (e: any) {
      Alert.alert('Generation Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={s.loadingText}>Synthesizing {activeTab}...</Text>
      </View>
    );
    
    if (!generatedContent) return (
      <View style={s.center}>
        <Text style={s.emptyIcon}>✨</Text>
        <Text style={s.emptyText}>Tap Generate to create {activeTab}</Text>
      </View>
    );

    if (activeTab === 'flashcards' && Array.isArray(generatedContent)) {
      const card = generatedContent[flashcardIdx];
      if (!card) return null;
      return (
        <View style={s.toolContainer}>
          <TouchableOpacity 
            style={[s.flashcard, isFlipped && s.flashcardBack]} 
            onPress={() => setIsFlipped(!isFlipped)}
            activeOpacity={0.9}
          >
            <Text style={s.flashcardLabel}>{isFlipped ? 'ANSWER' : 'QUESTION'}</Text>
            <Text style={s.flashcardText}>{isFlipped ? card.back : card.front}</Text>
            <Text style={s.flashcardHint}>Tap to flip</Text>
          </TouchableOpacity>
          <View style={s.controls}>
            <TouchableOpacity 
              style={[s.controlBtn, flashcardIdx === 0 && s.controlBtnDisabled]} 
              onPress={() => { setFlashcardIdx(Math.max(0, flashcardIdx - 1)); setIsFlipped(false); }}
            >
              <Text style={s.controlText}>← Prev</Text>
            </TouchableOpacity>
            <Text style={s.controlCount}>{flashcardIdx + 1} / {generatedContent.length}</Text>
            <TouchableOpacity 
              style={[s.controlBtn, flashcardIdx === generatedContent.length - 1 && s.controlBtnDisabled]} 
              onPress={() => { setFlashcardIdx(Math.min(generatedContent.length - 1, flashcardIdx + 1)); setIsFlipped(false); }}
            >
              <Text style={s.controlText}>Next →</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (activeTab === 'quiz' && Array.isArray(generatedContent)) {
      const q = generatedContent[quizIdx];
      if (!q) return null;
      const isLast = quizIdx === generatedContent.length - 1;
      
      let score = 0;
      if (quizSubmitted) {
        generatedContent.forEach((item: any, i: number) => {
          if (selectedAnswers[i] === item.correct_answer) score++;
        });
      }

      if (quizSubmitted && quizIdx === generatedContent.length) {
        return (
          <View style={s.center}>
            <Text style={s.scoreTitle}>Quiz Complete!</Text>
            <Text style={s.scoreText}>{score} / {generatedContent.length}</Text>
            <TouchableOpacity style={s.actionBtn} onPress={() => { setQuizSubmitted(false); setQuizIdx(0); setSelectedAnswers({}); }}>
              <Text style={s.actionBtnText}>Retake Quiz</Text>
            </TouchableOpacity>
          </View>
        );
      }

      const hasAnsweredCurrent = selectedAnswers[quizIdx] !== undefined;

      return (
        <View style={s.toolContainer}>
          <Text style={s.quizTitle}>Question {quizIdx + 1} of {generatedContent.length}</Text>
          <Text style={s.quizQ}>{q.question}</Text>
          
          <View style={s.quizOptions}>
            {q.options.map((opt: string) => {
              const isSelected = selectedAnswers[quizIdx] === opt;
              const isCorrect = opt === q.correct_answer;
              
              let optStyle = s.quizOpt;
              let textStyle = s.quizOptText;
              
              if (quizSubmitted || hasAnsweredCurrent) {
                if (isCorrect) {
                  optStyle = s.quizOptCorrect;
                  textStyle = s.quizOptTextWhite;
                } else if (isSelected) {
                  optStyle = s.quizOptWrong;
                  textStyle = s.quizOptTextWhite;
                }
              } else if (isSelected) {
                optStyle = s.quizOptSelected;
              }

              return (
                <TouchableOpacity 
                  key={opt} 
                  style={optStyle} 
                  onPress={() => { if (!quizSubmitted) setSelectedAnswers({...selectedAnswers, [quizIdx]: opt}) }}
                  disabled={quizSubmitted || hasAnsweredCurrent}
                >
                  <Text style={textStyle}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {(quizSubmitted || hasAnsweredCurrent) && (
            <View style={s.explanation}>
              <Text style={s.explanationText}>{q.explanation}</Text>
            </View>
          )}

          <TouchableOpacity 
            style={[s.actionBtn, !hasAnsweredCurrent && s.actionBtnDisabled, { marginTop: spacing.xl }]} 
            onPress={() => {
              if (isLast) { setQuizSubmitted(true); setQuizIdx(quizIdx + 1); }
              else { setQuizIdx(quizIdx + 1); }
            }}
            disabled={!hasAnsweredCurrent}
          >
            <Text style={s.actionBtnText}>{isLast ? 'Finish Quiz' : 'Next Question'}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeTab === 'notes' || activeTab === 'summary') {
      return (
        <ScrollView style={s.toolContainer}>
          <Text style={s.markdownText}>{typeof generatedContent === 'string' ? generatedContent : JSON.stringify(generatedContent, null, 2)}</Text>
        </ScrollView>
      );
    }

    return null;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[s.root, { paddingBottom: insets.bottom }]}>
        <View style={s.header}>
          <Text style={s.title}>🧰 Study Tools</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={s.tabs}>
          {(['flashcards', 'quiz', 'notes', 'summary'] as ToolType[]).map(t => (
            <TouchableOpacity key={t} style={[s.tab, activeTab === t && s.tabActive]} onPress={() => setActiveTab(t)}>
              <Text style={[s.tabText, activeTab === t && s.tabTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.configArea}>
          <TextInput 
            style={s.input} 
            placeholder="Optional: What should I focus on?" 
            placeholderTextColor={colors.muted}
            value={studyFocus}
            onChangeText={setStudyFocus}
          />
          <TouchableOpacity style={s.generateBtn} onPress={handleGenerate} disabled={loading || !pdfContext}>
            <Text style={s.generateBtnText}>Generate</Text>
          </TouchableOpacity>
        </View>

        <View style={s.contentArea}>
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { color: colors.foreground, fontSize: typography.lg, fontWeight: '800' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.muted, fontSize: 16, fontWeight: '600' },
  
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { color: colors.muted, fontSize: typography.sm, fontWeight: '600' },
  tabTextActive: { color: colors.primary },

  configArea: { padding: spacing.lg, gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  input: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, color: colors.foreground, borderWidth: 1, borderColor: colors.border },
  generateBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  generateBtnText: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },

  contentArea: { flex: 1, padding: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: spacing.sm },
  emptyText: { color: colors.muted, fontSize: typography.sm },
  loadingText: { color: colors.primary, marginTop: spacing.md, fontWeight: '600' },

  toolContainer: { flex: 1 },
  
  // Flashcards
  flashcard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, minHeight: 300 },
  flashcardBack: { backgroundColor: colors.primary + '10', borderColor: colors.primary },
  flashcardLabel: { position: 'absolute', top: spacing.md, left: spacing.md, color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  flashcardText: { color: colors.foreground, fontSize: typography.lg, fontWeight: '600', textAlign: 'center', lineHeight: 28 },
  flashcardHint: { position: 'absolute', bottom: spacing.md, color: colors.muted, fontSize: 12 },
  controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg },
  controlBtn: { padding: spacing.sm },
  controlBtnDisabled: { opacity: 0.3 },
  controlText: { color: colors.primary, fontWeight: '700' },
  controlCount: { color: colors.muted, fontWeight: '600' },

  // Quiz
  quizTitle: { color: colors.muted, fontSize: typography.xs, fontWeight: '700', textTransform: 'uppercase', marginBottom: spacing.sm },
  quizQ: { color: colors.foreground, fontSize: typography.lg, fontWeight: '700', marginBottom: spacing.xl, lineHeight: 26 },
  quizOptions: { gap: spacing.sm },
  quizOpt: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  quizOptSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
  quizOptCorrect: { borderColor: colors.green, backgroundColor: colors.green },
  quizOptWrong: { borderColor: colors.red, backgroundColor: colors.red },
  quizOptText: { color: colors.foreground, fontSize: typography.sm, fontWeight: '600' },
  quizOptTextWhite: { color: '#fff', fontSize: typography.sm, fontWeight: '600' },
  explanation: { marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  explanationText: { color: colors.foreground, fontSize: typography.sm },
  actionBtn: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.lg, alignItems: 'center' },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
  scoreTitle: { color: colors.foreground, fontSize: typography['2xl'], fontWeight: '800', marginBottom: spacing.sm },
  scoreText: { color: colors.primary, fontSize: 48, fontWeight: '900', marginBottom: spacing.xxl },

  // Notes/Summary
  markdownText: { color: colors.foreground, fontSize: typography.sm, lineHeight: 24 },
});
