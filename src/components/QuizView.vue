<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuizStore } from '../stores/quizStore'

const emit = defineEmits<{
  exit: []
}>()

const quizStore = useQuizStore()

const selectedAnswer = ref('')
const multiSelected = ref<Set<string>>(new Set())
const showSessionWrong = ref(false)

const isMultiChoice = computed(() => {
  const q = quizStore.currentQuestion
  if (!q) return false
  return q.answer.length > 1
})

const optionLetters = computed(() => {
  const q = quizStore.currentQuestion
  if (!q) return []
  return Object.keys(q.options).sort()
})

// 重置选择
watch(() => quizStore.currentIndex, () => {
  selectedAnswer.value = ''
  multiSelected.value = new Set()
})

function selectOption(letter: string) {
  if (quizStore.showResult) return

  if (isMultiChoice.value) {
    if (multiSelected.value.has(letter)) {
      multiSelected.value.delete(letter)
    } else {
      multiSelected.value.add(letter)
    }
    selectedAnswer.value = [...multiSelected.value].sort().join('')
  } else {
    selectedAnswer.value = letter
  }
}

function handleSubmit() {
  if (!selectedAnswer.value) return
  quizStore.submitAnswer(selectedAnswer.value)
}

function userAnswerFor(questionId?: number): string {
  if (!questionId) return ''
  return quizStore.answers.get(questionId) || ''
}

function isQuestionAnsweredCorrectly(questionId?: number, correctAnswer = ''): boolean {
  return quizStore.isAnswerCorrect(userAnswerFor(questionId), correctAnswer)
}

function retryWrongQuestions() {
  quizStore.retryCurrentWrongQuestions()
  selectedAnswer.value = ''
  multiSelected.value = new Set()
  showSessionWrong.value = false
}

function getOptionClass(letter: string): string {
  if (!quizStore.showResult) {
    if (isMultiChoice.value) {
      return multiSelected.value.has(letter) ? 'selected' : ''
    }
    return selectedAnswer.value === letter ? 'selected' : ''
  }

  const q = quizStore.currentQuestion
  if (!q) return ''

  const isCorrect = q.answer.includes(letter)
  const isSelected = isMultiChoice.value
    ? multiSelected.value.has(letter)
    : selectedAnswer.value === letter

  if (isCorrect) return 'correct disabled'
  if (isSelected && !isCorrect) return 'wrong disabled'
  return 'disabled'
}

const scorePercent = computed(() => {
  if (quizStore.totalQuestions === 0) return 0
  return Math.round((quizStore.correctCount / quizStore.totalQuestions) * 100)
})

const hasSessionWrong = computed(() => quizStore.currentWrongQuestions.length > 0)
</script>

<template>
  <div class="quiz-container fade-in">
    <!-- 题库为空提示 -->
    <div v-if="quizStore.totalQuestions === 0 && !quizStore.finished" class="card empty-card">
      <p class="empty-icon">0</p>
      <p class="empty-text">该题库没有可用题目，请返回题库重新导入/删除后再导入</p>
      <button class="btn btn-primary" @click="emit('exit')">返回题库</button>
    </div>

    <!-- 答题头部 -->
    <div v-else class="quiz-header">
      <button class="btn btn-outline btn-sm" @click="emit('exit')">← 退出</button>
      <div class="quiz-progress-info">
        <span>{{ quizStore.currentIndex + 1 }} / {{ quizStore.totalQuestions }}</span>
        <span class="quiz-type-badge" :class="quizStore.isMixed ? 'badge-mixed' : 'badge-single'">
          {{ quizStore.sourceLabel }}
        </span>
        <span class="quiz-mode-badge">
          {{ quizStore.mode === 'random' ? '随机' : '顺序' }}
        </span>
      </div>
    </div>

    <div v-if="quizStore.totalQuestions > 0" class="progress-bar" style="margin-bottom: 20px;">
      <div class="progress-bar-fill" :style="{ width: quizStore.progress + '%' }"></div>
    </div>

    <!-- 答题完成 -->
    <div v-if="quizStore.finished" class="card result-card">
      <h2>答题完成</h2>
      <div class="result-quiz-type">
        <span class="quiz-type-badge" :class="quizStore.isMixed ? 'badge-mixed' : 'badge-single'">
          {{ quizStore.sourceLabel }}
        </span>
      </div>
      <div class="result-stats">
        <div class="result-item">
          <span class="result-value">{{ quizStore.totalQuestions }}</span>
          <span class="result-label">总题数</span>
        </div>
        <div class="result-item">
          <span class="result-value text-success">{{ quizStore.correctCount }}</span>
          <span class="result-label">正确</span>
        </div>
        <div class="result-item">
          <span class="result-value text-danger">{{ quizStore.wrongCount }}</span>
          <span class="result-label">错误</span>
        </div>
        <div class="result-item">
          <span class="result-value">{{ scorePercent }}%</span>
          <span class="result-label">正确率</span>
        </div>
      </div>
      <p v-if="!hasSessionWrong" class="result-note">本次全对，继续保持。</p>
      <div class="result-actions">
        <button
          v-if="hasSessionWrong"
          class="btn btn-outline"
          @click="showSessionWrong = !showSessionWrong"
        >
          {{ showSessionWrong ? '收起本次错题' : '查看本次错题' }}
        </button>
        <button
          v-if="hasSessionWrong"
          class="btn btn-primary"
          @click="retryWrongQuestions"
        >
          重做本次错题
        </button>
        <button class="btn btn-outline" @click="emit('exit')">返回题库</button>
        <button class="btn btn-primary" @click="quizStore.resetQuiz(); selectedAnswer = ''; multiSelected = new Set(); showSessionWrong = false">重新答题</button>
      </div>

      <div v-if="showSessionWrong && hasSessionWrong" class="session-wrong-list">
        <h3>本次错题</h3>
        <article
          v-for="(wrongQuestion, index) in quizStore.currentWrongQuestions"
          :key="wrongQuestion.id || index"
          class="wrong-review-card"
        >
          <div class="question-meta">
            <span class="badge badge-danger">错题 {{ index + 1 }}</span>
            <span class="badge badge-chapter" v-if="wrongQuestion.chapter">
              {{ wrongQuestion.chapter }}
            </span>
            <span class="badge badge-type" v-if="wrongQuestion.type">
              {{ wrongQuestion.type }}
            </span>
          </div>

          <h4 class="wrong-question-text">{{ wrongQuestion.content }}</h4>

          <div class="options-list">
            <div
              v-for="letter in Object.keys(wrongQuestion.options).sort()"
              :key="letter"
              class="option-display"
              :class="{
                'correct-option': wrongQuestion.answer.includes(letter),
                'wrong-option': userAnswerFor(wrongQuestion.id).includes(letter) && !wrongQuestion.answer.includes(letter)
              }"
            >
              <span class="option-letter">{{ letter }}</span>
              <span class="option-text">{{ wrongQuestion.options[letter] }}</span>
            </div>
          </div>

          <div class="wrong-answer-summary">
            <span>正确答案：<strong>{{ wrongQuestion.answer }}</strong></span>
            <span>你的答案：{{ userAnswerFor(wrongQuestion.id) || '未作答' }}</span>
          </div>

          <div class="explanation" v-if="wrongQuestion.explanation">
            <p class="explanation-title">解析：</p>
            <p>{{ wrongQuestion.explanation }}</p>
          </div>
        </article>
      </div>
    </div>

    <!-- 当前题目 -->
    <div v-else-if="quizStore.currentQuestion" class="question-card card">
      <div class="question-meta" v-if="quizStore.currentQuestion.chapter || quizStore.currentQuestion.type">
        <span class="badge badge-chapter" v-if="quizStore.currentQuestion.chapter">
          {{ quizStore.currentQuestion.chapter }}
        </span>
        <span class="badge badge-type" v-if="quizStore.currentQuestion.type">
          {{ quizStore.currentQuestion.type }}
        </span>
        <span class="badge badge-multi" v-if="isMultiChoice">多选</span>
      </div>

      <h2 class="question-text">{{ quizStore.currentQuestion.content }}</h2>

      <div class="options-list">
        <button
          v-for="letter in optionLetters"
          :key="letter"
          class="option-btn"
          :class="getOptionClass(letter)"
          @click="selectOption(letter)"
        >
          <span class="option-letter">{{ letter }}</span>
          <span class="option-text">{{ quizStore.currentQuestion.options[letter] }}</span>
        </button>
      </div>

      <!-- 提交按钮 -->
      <div class="quiz-actions" v-if="!quizStore.showResult">
        <button
          class="btn btn-primary btn-lg"
          :disabled="!selectedAnswer"
          @click="handleSubmit"
        >
          提交答案
        </button>
      </div>

      <!-- 结果显示 -->
      <div v-if="quizStore.showResult" class="result-panel">
        <div
          class="result-banner"
          :class="isQuestionAnsweredCorrectly(quizStore.currentQuestion.id, quizStore.currentQuestion.answer) ? 'correct' : 'wrong'"
        >
          <span v-if="isQuestionAnsweredCorrectly(quizStore.currentQuestion.id, quizStore.currentQuestion.answer)">回答正确</span>
          <span v-else>回答错误</span>
        </div>

        <div class="correct-answer">
          正确答案：<strong>{{ quizStore.currentQuestion.answer }}</strong>
          <span v-if="!isQuestionAnsweredCorrectly(quizStore.currentQuestion.id, quizStore.currentQuestion.answer)">
            ｜ 你的答案：{{ selectedAnswer }}
          </span>
        </div>

        <div class="explanation" v-if="quizStore.currentQuestion.explanation">
          <p class="explanation-title">解析：</p>
          <p>{{ quizStore.currentQuestion.explanation }}</p>
        </div>

        <button class="btn btn-primary btn-lg" style="width: 100%" @click="quizStore.nextQuestion(); selectedAnswer = ''; multiSelected = new Set()">
          {{ quizStore.currentIndex < quizStore.totalQuestions - 1 ? '下一题' : '查看结果' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz-container {
  max-width: 720px;
  margin: 0 auto;
}

.quiz-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.quiz-progress-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--muted-foreground);
}

.quiz-type-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
}

.badge-mixed {
  background: var(--primary);
  color: var(--primary-foreground);
}

.badge-single {
  background: var(--accent);
  color: var(--muted-foreground);
}

.quiz-mode-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 12px;
  background: var(--accent);
  color: var(--muted-foreground);
}

.question-card {
  padding: 24px;
}

.question-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.badge-chapter {
  background: var(--accent);
  color: var(--primary);
}

.badge-type {
  background: var(--accent);
  color: var(--warning);
}

.badge-multi {
  background: var(--primary);
  color: var(--primary-foreground);
}

.question-text {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.6;
  margin-bottom: 20px;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.option-text {
  flex: 1;
  line-height: 1.5;
}

.quiz-actions {
  text-align: center;
  margin-top: 20px;
}

.result-panel {
  margin-top: 20px;
}

.result-banner {
  padding: 12px 16px;
  border-radius: var(--radius);
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 12px;
}

.result-banner.correct {
  background: rgba(22, 163, 74, 0.15);
  color: var(--success);
}

.result-banner.wrong {
  background: rgba(220, 38, 38, 0.15);
  color: var(--danger);
}

.correct-answer {
  font-size: 15px;
  margin-bottom: 12px;
  color: var(--muted-foreground);
}

.explanation {
  background: var(--accent);
  padding: 16px;
  border-radius: var(--radius);
  margin-bottom: 20px;
  line-height: 1.7;
  color: var(--muted-foreground);
}

.explanation-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--foreground);
}

.result-card {
  text-align: center;
  padding: 40px 20px;
}

.result-card h2 {
  font-size: 24px;
  margin-bottom: 12px;
}

.result-quiz-type {
  margin-bottom: 24px;
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.result-item {
  text-align: center;
}

.result-value {
  display: block;
  font-size: 32px;
  font-weight: 700;
  color: var(--foreground);
}

.result-label {
  font-size: 14px;
  color: var(--muted-foreground);
}

.result-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.result-note {
  margin-bottom: 20px;
  color: var(--success);
  font-weight: 600;
}

.session-wrong-list {
  margin-top: 28px;
  text-align: left;
}

.session-wrong-list h3 {
  font-size: 18px;
  margin-bottom: 12px;
}

.wrong-review-card {
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.04);
  margin-bottom: 14px;
}

.wrong-question-text {
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 14px;
}

.option-display {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  font-size: 15px;
}

.option-display .option-letter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent);
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.correct-option {
  border-color: var(--success);
  background: rgba(22, 163, 74, 0.15);
}

.wrong-option {
  border-color: var(--danger);
  background: rgba(220, 38, 38, 0.15);
}

.correct-option .option-letter {
  background: var(--success);
  color: white;
}

.wrong-option .option-letter {
  background: var(--danger);
  color: white;
}

.wrong-answer-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 12px 0;
  color: var(--muted-foreground);
  font-size: 14px;
}

.text-success {
  color: var(--success);
}

.text-danger {
  color: var(--danger);
}

.empty-card {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  color: var(--muted-foreground);
  margin-bottom: 24px;
}

@media (max-width: 640px) {
  .question-card {
    padding: 16px;
  }

  .question-text {
    font-size: 16px;
  }

  .result-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
