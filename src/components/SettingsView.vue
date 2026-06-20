<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useBankStore } from '../stores/bankStore'
import { clearAllData, exportBank, db } from '../db'

const emit = defineEmits<{
  done: []
}>()

const bankStore = useBankStore()
const exporting = ref(false)

onMounted(() => {
  bankStore.loadBanks()
})

async function handleClearAll() {
  if (!confirm('确定要清空所有数据吗？此操作不可撤销！')) return
  if (!confirm('再次确认：清空后所有题库、答题记录、错题本都将丢失。')) return

  await clearAllData()
  await bankStore.loadBanks()
  alert('所有数据已清空。')
}

async function handleExportBank(bankId: number, bankName: string) {
  exporting.value = true
  try {
    const json = await exportBank(bankId)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${bankName}.json`
    a.click()
    URL.revokeObjectURL(url)
  } finally {
    exporting.value = false
  }
}

async function handleExportAll() {
  exporting.value = true
  try {
    const banks = await db.banks.toArray()
    const questions = await db.questions.toArray()
    const answers = await db.answers.toArray()
    const json = JSON.stringify({ banks, questions, answers }, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '刷题助手_全量导出.json'
    a.click()
    URL.revokeObjectURL(url)
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="fade-in">
    <div class="section-header">
      <h1>设置</h1>
    </div>

    <!-- 数据管理 -->
    <div class="card settings-section">
      <h2>📤 数据导出</h2>
      <p class="section-desc">导出题库数据为 JSON 文件，可用于备份或迁移。</p>

      <div class="export-list" v-if="bankStore.banks.length > 0">
        <div class="export-item" v-for="bank in bankStore.banks" :key="bank.id">
          <div class="export-info">
            <span class="export-name">{{ bank.name }}</span>
            <span class="export-count">{{ bank.questionCount }} 题</span>
          </div>
          <button
            class="btn btn-outline btn-sm"
            @click="handleExportBank(bank.id!, bank.name)"
            :disabled="exporting"
          >
            导出
          </button>
        </div>
      </div>

      <div class="empty-hint" v-else>
        <p>暂无题库可导出。</p>
      </div>

      <button
        class="btn btn-outline"
        style="margin-top: 12px"
        @click="handleExportAll"
        :disabled="exporting || bankStore.banks.length === 0"
      >
        导出全部数据
      </button>
    </div>

    <!-- 危险操作 -->
    <div class="card settings-section danger-section">
      <h2>⚠️ 危险操作</h2>
      <p class="section-desc">清空所有本地数据，包括题库、答题记录和错题本。此操作不可撤销。</p>
      <button class="btn btn-danger" @click="handleClearAll">
        清空所有数据
      </button>
    </div>

    <!-- 关于 -->
    <div class="card settings-section">
      <h2>关于</h2>
      <p class="section-desc">
        刷题助手 v1.0 — 纯前端刷题应用<br />
        数据存储在浏览器本地（IndexedDB），不会上传到任何服务器。<br />
        支持导入 .xlsx 格式的题库文件；部署版会在首次打开时自动导入内置题库。
      </p>

      <div class="format-guide">
        <h3>推荐题库格式</h3>
        <p>第一行作为表头，后续每行一道题。建议使用以下列名：</p>
        <div class="format-columns">
          <span>题目</span>
          <span>A</span>
          <span>B</span>
          <span>C</span>
          <span>D</span>
          <span>E</span>
          <span>F</span>
          <span>答案</span>
          <span>解析</span>
          <span>章节</span>
          <span>题型</span>
        </div>
        <ul>
          <li>答案填写 A-F，多个答案可写成 AB、A,B 或 A B。</li>
          <li>E、F、解析、章节、题型可以为空。</li>
          <li>也兼容现有样本中的 题目内容、选项A、正确答案 等列名。</li>
          <li>.doc 文件不在浏览器内直接解析，请先用 WPS、Word 或 Excel 转为 .xlsx。</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-header {
  margin-bottom: 20px;
}

.section-header h1 {
  font-size: 24px;
  font-weight: 700;
}

.settings-section {
  margin-bottom: 16px;
}

.settings-section h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.section-desc {
  font-size: 14px;
  color: var(--gray-600);
  margin-bottom: 16px;
  line-height: 1.6;
}

.export-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.export-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--gray-50);
  border-radius: var(--radius);
}

.export-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.export-name {
  font-weight: 500;
}

.export-count {
  font-size: 13px;
  color: var(--gray-500);
}

.empty-hint {
  color: var(--gray-400);
  font-size: 14px;
}

.danger-section {
  border-color: var(--danger);
  border-width: 1px;
}

.danger-section h2 {
  color: var(--danger);
}

.format-guide {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.03);
}

.format-guide h3 {
  font-size: 15px;
  margin-bottom: 8px;
}

.format-guide p,
.format-guide li {
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 1.7;
}

.format-guide ul {
  margin: 10px 0 0 18px;
}

.format-columns {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0;
}

.format-columns span {
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.14);
  color: #c7d2fe;
  font-size: 12px;
  font-weight: 600;
}
</style>
