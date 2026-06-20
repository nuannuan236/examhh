<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useBankStore } from '../stores/bankStore'
import { getStats } from '../db'

const bankStore = useBankStore()
const selectedBankId = ref<number | undefined>(undefined)
const stats = ref({
  totalAnswers: 0,
  correctCount: 0,
  wrongCount: 0,
  accuracy: 0,
  answeredQuestions: 0,
  totalQuestions: 0,
  progress: 0,
})

onMounted(async () => {
  await bankStore.loadBanks()
  await loadStats()
})

watch(selectedBankId, loadStats)

async function loadStats() {
  stats.value = await getStats(selectedBankId.value)
}
</script>

<template>
  <div class="fade-in">
    <div class="section-header">
      <h1>学习统计</h1>
      <select v-model="selectedBankId" @change="loadStats">
        <option :value="undefined">全部题库</option>
        <option v-for="bank in bankStore.banks" :key="bank.id" :value="bank.id">
          {{ bank.name }}
        </option>
      </select>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value">{{ stats.totalQuestions }}</div>
        <div class="stat-label">总题数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.answeredQuestions }}</div>
        <div class="stat-label">已答题</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-success">{{ stats.correctCount }}</div>
        <div class="stat-label">累计正确</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-danger">{{ stats.wrongCount }}</div>
        <div class="stat-label">累计错误</div>
      </div>
    </div>

    <div class="card progress-section">
      <h3>答题进度</h3>
      <div class="progress-detail">
        <div class="progress-bar" style="height: 12px;">
          <div class="progress-bar-fill" :style="{ width: stats.progress + '%' }"></div>
        </div>
        <span class="progress-text">{{ stats.progress }}%</span>
      </div>
      <p class="progress-note">
        已答 {{ stats.answeredQuestions }} / {{ stats.totalQuestions }} 题
      </p>
    </div>

    <div class="card progress-section">
      <h3>正确率</h3>
      <div class="progress-detail">
        <div class="progress-bar" style="height: 12px;">
          <div
            class="progress-bar-fill"
            :style="{
              width: stats.accuracy + '%',
              background: stats.accuracy >= 80 ? 'var(--success)' : stats.accuracy >= 60 ? 'var(--warning)' : 'var(--danger)'
            }"
          ></div>
        </div>
        <span class="progress-text">{{ stats.accuracy }}%</span>
      </div>
      <p class="progress-note">
        共答 {{ stats.totalAnswers }} 次，正确 {{ stats.correctCount }} 次
      </p>
    </div>

    <div class="empty-state card" v-if="stats.totalAnswers === 0">
      <p>暂无答题记录，开始刷题后这里会显示统计信息。</p>
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

.progress-section {
  margin-bottom: 16px;
}

.progress-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.progress-detail {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-detail .progress-bar {
  flex: 1;
}

.progress-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--gray-800);
  min-width: 50px;
  text-align: right;
}

.progress-note {
  font-size: 13px;
  color: var(--gray-500);
  margin-top: 8px;
}

.text-success {
  color: var(--success);
}

.text-danger {
  color: var(--danger);
}
</style>
