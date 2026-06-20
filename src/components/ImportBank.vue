<script setup lang="ts">
import { ref } from 'vue'
import { parseXlsxFile } from '../parser'
import { useBankStore } from '../stores/bankStore'
import type { ImportPreview } from '../types'

const emit = defineEmits<{
  done: []
  cancel: []
}>()

const bankStore = useBankStore()
const preview = ref<ImportPreview | null>(null)
const loading = ref(false)
const importing = ref(false)
const error = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

function triggerFileInput() {
  fileInput.value?.click()
}

async function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.name.endsWith('.xlsx')) {
    error.value = '请选择 .xlsx 格式的文件。如果是 .doc 文件，请先用 Excel 转换为 .xlsx。'
    return
  }

  loading.value = true
  error.value = ''
  preview.value = null

  try {
    preview.value = await parseXlsxFile(file)
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}

async function handleImport() {
  if (!preview.value) return
  importing.value = true
  try {
    await bankStore.importBank(preview.value)
    emit('done')
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <div class="fade-in">
    <div class="section-header">
      <h1>导入题库</h1>
      <button class="btn btn-outline" @click="emit('cancel')">返回</button>
    </div>

    <!-- 上传区域 -->
    <div class="upload-area card" @click="triggerFileInput" v-if="!preview">
      <input
        ref="fileInput"
        type="file"
        accept=".xlsx"
        style="display: none"
        @change="handleFileChange"
      />
      <div class="upload-icon">XLSX</div>
      <p class="upload-text">点击选择 .xlsx 文件</p>
      <p class="upload-hint">
        支持标准列：题目、A、B、C、D、E、F、答案、解析、章节、题型<br />
        兼容别名：question、answer、analysis、正确答案 等
      </p>
    </div>

    <!-- 加载中 -->
    <div class="card" v-if="loading">
      <p style="text-align: center; color: var(--gray-500);">正在解析文件...</p>
    </div>

    <!-- 错误提示 -->
    <div class="error-box" v-if="error">
      <p>错误：{{ error }}</p>
    </div>

    <!-- 预览结果 -->
    <div class="preview-section" v-if="preview">
      <div class="card">
        <h2>解析预览</h2>
        <div class="preview-stats">
          <div class="stat-item">
            <span class="stat-value">{{ preview.totalRows }}</span>
            <span class="stat-label">总行数</span>
          </div>
          <div class="stat-item">
            <span class="stat-value text-success">{{ preview.parsedCount }}</span>
            <span class="stat-label">成功解析</span>
          </div>
          <div class="stat-item">
            <span class="stat-value text-danger">{{ preview.skippedCount }}</span>
            <span class="stat-label">跳过</span>
          </div>
        </div>

        <!-- 跳过原因 -->
        <div class="skip-reasons" v-if="preview.errors.length > 0">
          <p class="skip-title">跳过原因：</p>
          <ul>
            <li v-for="(err, i) in preview.errors" :key="i">{{ err }}</li>
          </ul>
        </div>

        <!-- 题目预览 -->
        <div class="question-preview" v-if="preview.questions.length > 0">
          <h3>前 5 题预览</h3>
          <div
            class="preview-item"
            v-for="(q, i) in preview.questions.slice(0, 5)"
            :key="i"
          >
            <p class="preview-q">{{ i + 1 }}. {{ q.content }}</p>
            <div class="preview-options">
              <span
                v-for="(val, key) in q.options"
                :key="key"
                :class="{ 'correct-option': q.answer.includes(key as string) }"
              >
                {{ key }}. {{ val }}
              </span>
            </div>
            <p class="preview-answer">
              答案: <strong>{{ q.answer }}</strong>
              <span v-if="q.chapter"> | 章节: {{ q.chapter }}</span>
              <span v-if="q.type"> | 题型: {{ q.type }}</span>
            </p>
          </div>
        </div>

        <div class="preview-actions">
          <button class="btn btn-outline" @click="preview = null; error = ''">重新选择</button>
          <button
            class="btn btn-success btn-lg"
            @click="handleImport"
            :disabled="importing || preview.parsedCount === 0"
          >
            {{ importing ? '导入中...' : `确认导入 ${preview.parsedCount} 题` }}
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

.upload-area {
  text-align: center;
  padding: 60px 20px;
  cursor: pointer;
  border: 2px dashed var(--gray-300);
  transition: border-color 0.15s;
}

.upload-area:hover {
  border-color: var(--primary);
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.upload-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--gray-700);
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 13px;
  color: var(--gray-400);
  line-height: 1.8;
}

.error-box {
  background: var(--danger-bg);
  color: var(--danger);
  padding: 12px 16px;
  border-radius: var(--radius);
  margin-bottom: 16px;
}

.preview-section h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}

.preview-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-item {
  text-align: center;
  padding: 12px;
  background: var(--gray-50);
  border-radius: var(--radius);
}

.stat-item .stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
}

.text-success {
  color: var(--success);
}

.text-danger {
  color: var(--danger);
}

.skip-reasons {
  background: var(--warning-bg);
  padding: 12px 16px;
  border-radius: var(--radius);
  margin-bottom: 16px;
  font-size: 13px;
}

.skip-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.skip-reasons ul {
  padding-left: 20px;
  color: var(--gray-600);
}

.question-preview {
  margin-top: 16px;
}

.question-preview h3 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--gray-600);
}

.preview-item {
  padding: 12px;
  background: var(--gray-50);
  border-radius: var(--radius);
  margin-bottom: 8px;
}

.preview-q {
  font-weight: 500;
  margin-bottom: 6px;
}

.preview-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 14px;
  color: var(--gray-600);
}

.correct-option {
  color: var(--success);
  font-weight: 600;
}

.preview-answer {
  font-size: 13px;
  color: var(--gray-500);
}

.preview-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
</style>
