<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useBankStore } from '../stores/bankStore'
import { getWrongQuestions, getQuestionsByBankId } from '../db'
import type { Question } from '../types'

const emit = defineEmits<{
  quiz: [bankId: number, mode: 'sequential' | 'random', size: number]
}>()

const bankStore = useBankStore()
const wrongQuestions = ref<(Question & { userAnswer: string })[]>([])
const selectedBankId = ref<number | undefined>(undefined)
const loading = ref(false)
const currentIndex = ref(0)
const showAnswer = ref(false)

const currentQuestion = computed(() => wrongQuestions.value[currentIndex.value] || null)
const totalWrong = computed(() => wrongQuestions.value.length)

onMounted(async () => {
  await bankStore.loadBanks()
  await loadWrongQuestions()
})

async function loadWrongQuestions() {
  loading.value = true
  try {
    wrongQuestions.value = await getWrongQuestions(selectedBankId.value)
  } finally {
    loading.value = false
  }
}

function prevQuestion() {
  if (currentIndex.value > 0) {
    currentIndex.value--
    showAnswer.value = false
  }
}

function nextQuestion() {
  if (currentIndex.value < wrongQuestions.value.length - 1) {
    currentIndex.value++
    showAnswer.value = false
  }
}

function handleBankChange() {
  currentIndex.value = 0
  showAnswer.value = false
  loadWrongQuestions()
}
</script>

<template>
  <div class="fade-in">
    <div class="section-header">
      <h1>错题本</h1>
      <select v-model="selectedBankId" @change="handleBankChange">
        <option :value="undefined">全部题库</option>
        <option v-for="bank in bankStore.banks" :key="bank.id" :value="bank.id">
          {{ bank.name }}
        </option>
      </select>
    </div>

    <!-- 空状态 -->
    <div class="empty-state card" v-if="!loading && wrongQuestions.length === 0">
      <p>暂无错题，继续保持。</p>
    </div>

    <!-- 加载中 -->
    <div class="card" v-if="loading">
      <p style="text-align: center; color: var(--gray-500);">加载中...</p>
    </div>

    <!-- 错题列表 -->
    <div v-if="wrongQuestions.length > 0">
      <div class="wrong-nav">
        <span>{{ currentIndex + 1 }} / {{ totalWrong }}</span>
        <div class="wrong-nav-btns">
          <button class="btn btn-outline btn-sm" :disabled="currentIndex === 0" @click="prevQuestion">上一题</button>
          <button class="btn btn-outline btn-sm" :disabled="currentIndex >= totalWrong - 1" @click="nextQuestion">下一题</button>
        </div>
      </div>

      <div class="card question-card" v-if="currentQuestion">
        <div class="question-meta">
          <span class="badge badge-danger">错题</span>
          <span class="badge badge-primary" v-if="currentQuestion.chapter">{{ currentQuestion.chapter }}</span>
          <span class="badge badge-warning" v-if="currentQuestion.type">{{ currentQuestion.type }}</span>
        </div>

        <h2 class="question-text">{{ currentQuestion.content }}</h2>

        <div class="options-list">
          <div
            v-for="(val, key) in currentQuestion.options"
            :key="key"
            class="option-display"
            :class="{
              'correct-option': currentQuestion.answer.includes(key as string),
              'wrong-option': currentQuestion.userAnswer.includes(key as string) && !currentQuestion.answer.includes(key as string)
            }"
          >
            <span class="option-letter">{{ key }}</span>
            <span>{{ val }}</span>
          </div>
        </div>

        <button class="btn btn-outline" style="width: 100%; margin-top: 12px" @click="showAnswer = !showAnswer">
          {{ showAnswer ? '收起解析' : '查看解析' }}
        </button>

        <div v-if="showAnswer" class="explanation-panel">
          <p><strong>正确答案：</strong>{{ currentQuestion.answer }}</p>
          <p><strong>你的答案：</strong>{{ currentQuestion.userAnswer }}</p>
          <p v-if="currentQuestion.explanation">
            <strong>解析：</strong>{{ currentQuestion.explanation }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 12px;
}

.section-header h1 {
  font-size: 24px;
  font-weight: 700;
}

.wrong-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--gray-600);
}

.wrong-nav-btns {
  display: flex;
  gap: 8px;
}

.question-card {
  padding: 24px;
}

.question-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
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
  gap: 8px;
}

.option-display {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius);
  font-size: 15px;
}

.correct-option {
  border-color: var(--success);
  background: var(--success-bg);
}

.wrong-option {
  border-color: var(--danger);
  background: var(--danger-bg);
}

.option-display .option-letter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--gray-100);
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.correct-option .option-letter {
  background: var(--success);
  color: white;
}

.wrong-option .option-letter {
  background: var(--danger);
  color: white;
}

.explanation-panel {
  margin-top: 16px;
  padding: 16px;
  background: var(--gray-50);
  border-radius: var(--radius);
  line-height: 1.7;
}

.explanation-panel p {
  margin-bottom: 8px;
}

.explanation-panel p:last-child {
  margin-bottom: 0;
}

@media (max-width: 640px) {
  .question-card {
    padding: 16px;
  }
}
</style>
