<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBankStore } from '../stores/bankStore'
import type { QuestionBank } from '../types'

const emit = defineEmits<{
  import: []
  quiz: [bankIds: number[], mode: 'sequential' | 'random', size: number]
}>()

const bankStore = useBankStore()
const selectedIds = ref<Set<number>>(new Set())

// 单题库答题设置
const showQuizSettings = ref<number | null>(null)
const quizMode = ref<'sequential' | 'random'>('sequential')
const quizSize = ref(0)

// 混合考核设置
const showMixedSettings = ref(false)
const mixedMode = ref<'sequential' | 'random'>('random')
const mixedSize = ref(0)

onMounted(() => {
  bankStore.initializeBanks()
})

const selectedBanks = computed(() =>
  bankStore.banks.filter((b) => b.id !== undefined && selectedIds.value.has(b.id))
)

const selectedCount = computed(() => selectedIds.value.size)

const totalQuestions = computed(() =>
  bankStore.banks.reduce((sum, b) => sum + b.questionCount, 0)
)

const selectedTotalQuestions = computed(() =>
  selectedBanks.value.reduce((sum, b) => sum + b.questionCount, 0)
)

function toggleSelect(bankId: number) {
  if (selectedIds.value.has(bankId)) {
    selectedIds.value.delete(bankId)
  } else {
    selectedIds.value.add(bankId)
  }
  // 触发响应式
  selectedIds.value = new Set(selectedIds.value)
}

function isSelected(bankId: number) {
  return selectedIds.value.has(bankId)
}

function clearSelection() {
  selectedIds.value = new Set()
}

// 单题库答题
function openQuizSettings(bankId: number) {
  showQuizSettings.value = bankId
  quizMode.value = 'sequential'
  quizSize.value = 0
}

function confirmStartQuiz() {
  if (showQuizSettings.value !== null) {
    emit('quiz', [showQuizSettings.value], quizMode.value, quizSize.value)
    showQuizSettings.value = null
  }
}

// 混合考核
function openMixedSettings() {
  if (selectedCount.value === 0) return
  mixedMode.value = 'random'
  mixedSize.value = 0
  showMixedSettings.value = true
}

function confirmMixedQuiz() {
  if (selectedCount.value === 0) return
  const ids = [...selectedIds.value]
  emit('quiz', ids, mixedMode.value, mixedSize.value)
  showMixedSettings.value = false
}

function handleDelete(bank: QuestionBank) {
  if (confirm(`确定要删除题库「${bank.name}」吗？此操作不可撤销。`)) {
    bankStore.removeBank(bank.id!)
    // 如果被删除的题库在选中列表中，移除它
    if (bank.id !== undefined && selectedIds.value.has(bank.id)) {
      selectedIds.value.delete(bank.id)
      selectedIds.value = new Set(selectedIds.value)
    }
  }
}
</script>

<template>
  <div class="fade-in">
    <div class="section-header">
      <h1>我的题库</h1>
      <button class="btn btn-primary" @click="emit('import')">
        + 导入题库
      </button>
    </div>

    <!-- 提示信息 -->
    <div class="tip-box" v-if="bankStore.loading || bankStore.seeding">
      <p>{{ bankStore.seeding ? '正在加载内置题库...' : '正在读取题库...' }}</p>
      <p class="tip-note">首次打开会把内置 Excel 题库写入本地浏览器，后续可离线使用。</p>
    </div>

    <div class="tip-box error-box" v-else-if="bankStore.seedError">
      <p>内置题库加载失败：{{ bankStore.seedError }}</p>
      <p class="tip-note">你仍然可以手动导入 .xlsx 题库继续使用。</p>
    </div>

    <div class="tip-box" v-else-if="bankStore.banks.length === 0">
      <p>还没有题库，点击上方按钮导入 .xlsx 文件开始刷题。</p>
      <p class="tip-note">
        支持的标准列名：题目、A、B、C、D、答案、解析、章节、题型。
        也兼容 question、answer、analysis 等英文别名。
      </p>
    </div>

    <!-- 概览区 -->
    <div class="overview-grid" v-if="bankStore.banks.length > 0">
      <div class="overview-card">
        <span class="overview-value">{{ bankStore.banks.length }}</span>
        <span class="overview-label">题库总数</span>
      </div>
      <div class="overview-card">
        <span class="overview-value">{{ totalQuestions }}</span>
        <span class="overview-label">总题数</span>
      </div>
      <div class="overview-card">
        <span class="overview-value">{{ selectedCount }}</span>
        <span class="overview-label">已选题库</span>
      </div>
      <div class="overview-card">
        <span class="overview-value">{{ selectedTotalQuestions }}</span>
        <span class="overview-label">已选题量</span>
      </div>
    </div>

    <!-- 混合考核工具栏 -->
    <div class="mixed-toolbar" v-if="bankStore.banks.length > 0">
      <div class="mixed-info">
        <span class="mixed-count" v-if="selectedCount > 0">
          已选 <strong>{{ selectedCount }}</strong> 个题库，共 <strong>{{ selectedTotalQuestions }}</strong> 题
        </span>
        <span class="mixed-hint" v-else>勾选题库可进行混合考核</span>
      </div>
      <div class="mixed-actions">
        <button
          class="btn btn-outline btn-sm"
          v-if="selectedCount > 0"
          @click="clearSelection"
        >
          取消选择
        </button>
        <button
          class="btn btn-primary"
          :disabled="selectedCount === 0"
          @click="openMixedSettings"
        >
          开始混合考核
        </button>
      </div>
    </div>

    <!-- 题库列表 -->
    <div class="bank-grid" v-if="bankStore.banks.length > 0">
      <div
        class="bank-card card"
        v-for="bank in bankStore.banks"
        :key="bank.id"
        :class="{ 'bank-selected': isSelected(bank.id!) }"
      >
        <div class="bank-checkbox" @click="toggleSelect(bank.id!)">
          <div class="checkbox-box" :class="{ checked: isSelected(bank.id!) }">
            <span v-if="isSelected(bank.id!)">✓</span>
          </div>
        </div>
        <div class="bank-info">
          <h3>{{ bank.name }}</h3>
          <div class="bank-meta">
            <span class="badge badge-primary">{{ bank.questionCount }} 题</span>
            <span class="bank-file">{{ bank.fileName }}</span>
          </div>
        </div>
        <div class="bank-actions">
          <button class="btn btn-primary btn-sm" @click.stop="openQuizSettings(bank.id!)">
            开始答题
          </button>
          <button class="btn btn-outline btn-sm" @click.stop="handleDelete(bank)">
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- 单题库答题设置弹窗 -->
    <div class="modal-overlay" v-if="showQuizSettings !== null" @click.self="showQuizSettings = null">
      <div class="modal card">
        <h2>答题设置</h2>
        <div class="form-group">
          <label>答题模式</label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" v-model="quizMode" value="sequential" />
              <span>顺序答题</span>
            </label>
            <label class="radio-label">
              <input type="radio" v-model="quizMode" value="random" />
              <span>随机答题</span>
            </label>
          </div>
        </div>
        <div class="form-group">
          <label>抽题数量</label>
          <div class="size-input">
            <input
              type="number"
              v-model.number="quizSize"
              min="0"
              placeholder="0 = 全部题目"
            />
            <span class="size-hint">填 0 表示全部题目</span>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showQuizSettings = null">取消</button>
          <button class="btn btn-primary" @click="confirmStartQuiz">开始</button>
        </div>
      </div>
    </div>

    <!-- 混合考核设置弹窗 -->
    <div class="modal-overlay" v-if="showMixedSettings" @click.self="showMixedSettings = false">
      <div class="modal card">
        <h2>混合考核设置</h2>
        <div class="mixed-summary">
          <p>已选 <strong>{{ selectedCount }}</strong> 个题库，共 <strong>{{ selectedTotalQuestions }}</strong> 题</p>
          <div class="mixed-bank-list">
            <span class="mixed-bank-tag" v-for="bank in selectedBanks" :key="bank.id">
              {{ bank.name }} ({{ bank.questionCount }})
            </span>
          </div>
        </div>
        <div class="form-group">
          <label>答题模式</label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" v-model="mixedMode" value="sequential" />
              <span>顺序答题</span>
            </label>
            <label class="radio-label">
              <input type="radio" v-model="mixedMode" value="random" />
              <span>随机答题</span>
            </label>
          </div>
        </div>
        <div class="form-group">
          <label>抽题数量</label>
          <div class="size-input">
            <input
              type="number"
              v-model.number="mixedSize"
              min="0"
              :placeholder="`0 = 全部 ${selectedTotalQuestions} 题`"
            />
            <span class="size-hint">填 0 表示全部 {{ selectedTotalQuestions }} 题</span>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showMixedSettings = false">取消</button>
          <button
            class="btn btn-primary"
            :disabled="selectedTotalQuestions === 0"
            @click="confirmMixedQuiz"
          >
            开始考核
          </button>
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
}

.section-header h1 {
  font-size: 24px;
  font-weight: 700;
}

.tip-box {
  background: var(--card);
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 40px 20px;
  text-align: center;
  color: var(--muted-foreground);
}

.tip-note {
  font-size: 13px;
  color: var(--muted-foreground);
  margin-top: 8px;
  opacity: 0.7;
}

.error-box {
  border-color: rgba(239, 68, 68, 0.45);
  color: #fecaca;
}

/* 概览区 */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.overview-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.overview-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--foreground);
}

.overview-label {
  font-size: 12px;
  color: var(--muted-foreground);
}

/* 混合考核工具栏 */
.mixed-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 16px;
  gap: 12px;
}

.mixed-info {
  font-size: 14px;
  color: var(--muted-foreground);
}

.mixed-info strong {
  color: var(--foreground);
}

.mixed-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* 题库卡片 */
.bank-grid {
  display: grid;
  gap: 12px;
}

.bank-card {
  display: flex;
  align-items: center;
  gap: 12px;
  transition: border-color 0.15s;
}

.bank-card.bank-selected {
  border-color: var(--primary);
}

.bank-checkbox {
  cursor: pointer;
  flex-shrink: 0;
  padding: 4px;
}

.checkbox-box {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: white;
  transition: all 0.15s;
}

.checkbox-box.checked {
  background: var(--primary);
  border-color: var(--primary);
}

.bank-info {
  flex: 1;
  min-width: 0;
}

.bank-info h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
}

.bank-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bank-file {
  font-size: 12px;
  color: var(--muted-foreground);
}

.bank-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* 混合考核摘要 */
.mixed-summary {
  background: var(--accent);
  padding: 12px 16px;
  border-radius: var(--radius);
  margin-bottom: 16px;
  font-size: 14px;
  color: var(--muted-foreground);
}

.mixed-summary strong {
  color: var(--foreground);
}

.mixed-bank-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.mixed-bank-tag {
  display: inline-block;
  padding: 2px 8px;
  background: var(--primary);
  color: var(--primary-foreground);
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.modal {
  width: 100%;
  max-width: 420px;
}

.modal h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group > label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--muted-foreground);
  margin-bottom: 8px;
}

.radio-group {
  display: flex;
  gap: 16px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 14px;
  color: var(--foreground);
}

.size-input input {
  width: 100%;
}

.size-hint {
  display: block;
  font-size: 12px;
  color: var(--muted-foreground);
  margin-top: 4px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
}

@media (max-width: 640px) {
  .overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .bank-card {
    flex-wrap: wrap;
  }

  .bank-actions {
    width: 100%;
    padding-left: 36px;
  }

  .bank-actions .btn {
    flex: 1;
  }

  .mixed-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .mixed-actions {
    justify-content: flex-end;
  }
}
</style>
