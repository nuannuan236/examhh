import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Question, QuizMode } from '../types'
import { getBanksByIds, getQuestionsByBankIds, saveAnswerRecord } from '../db'

export const useQuizStore = defineStore('quiz', () => {
  const questions = ref<Question[]>([])
  const currentIndex = ref(0)
  const answers = ref<Map<number, string>>(new Map())
  const showResult = ref(false)
  const finished = ref(false)
  const bankIds = ref<number[]>([])
  const sourceLabel = ref('')
  const mode = ref<QuizMode>('sequential')
  const quizSize = ref(0) // 0 = 全部

  const isMixed = computed(() => bankIds.value.length > 1)
  const currentQuestion = computed(() => questions.value[currentIndex.value] || null)
  const totalQuestions = computed(() => questions.value.length)
  const progress = computed(() =>
    questions.value.length > 0
      ? Math.round(((currentIndex.value + (finished.value ? 1 : 0)) / questions.value.length) * 100)
      : 0
  )

  const correctCount = computed(() => {
    let count = 0
    for (const [qId, userAns] of answers.value) {
      const q = questions.value.find((q) => q.id === qId)
      if (q && normalizeAnswer(userAns) === normalizeAnswer(q.answer)) count++
    }
    return count
  })

  const wrongCount = computed(() => answers.value.size - correctCount.value)

  function normalizeAnswer(ans: string): string {
    return ans.replace(/[\s,，、;；]+/g, '').toUpperCase().split('').sort().join('')
  }

  async function startQuiz(targetBankIds: number[], quizMode: QuizMode, size: number) {
    bankIds.value = [...targetBankIds]
    const banks = await getBanksByIds(targetBankIds)
    sourceLabel.value = targetBankIds.length > 1
      ? `混合考核 · ${targetBankIds.length} 个题库`
      : (banks[0]?.name || '单题库考核')
    mode.value = quizMode
    quizSize.value = size
    currentIndex.value = 0
    answers.value = new Map()
    showResult.value = false
    finished.value = false

    let allQuestions = await getQuestionsByBankIds(targetBankIds)

    if (quizMode === 'random') {
      // Fisher-Yates shuffle
      for (let i = allQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]]
      }
    }

    if (size > 0 && size < allQuestions.length) {
      allQuestions = allQuestions.slice(0, size)
    }

    questions.value = allQuestions
  }

  async function submitAnswer(userAnswer: string) {
    const q = currentQuestion.value
    if (!q || !q.id) return

    answers.value.set(q.id, userAnswer)
    const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(q.answer)

    // 使用题目的原始 bankId，而非混合考核的 bankIds
    await saveAnswerRecord(q.id, q.bankId, userAnswer, isCorrect)
    showResult.value = true
  }

  function nextQuestion() {
    showResult.value = false
    if (currentIndex.value < questions.value.length - 1) {
      currentIndex.value++
    } else {
      finished.value = true
    }
  }

  function resetQuiz() {
    currentIndex.value = 0
    answers.value = new Map()
    showResult.value = false
    finished.value = false
  }

  return {
    questions,
    currentIndex,
    answers,
    showResult,
    finished,
    bankIds,
    sourceLabel,
    mode,
    quizSize,
    isMixed,
    currentQuestion,
    totalQuestions,
    progress,
    correctCount,
    wrongCount,
    startQuiz,
    submitAnswer,
    nextQuestion,
    resetQuiz,
  }
})
