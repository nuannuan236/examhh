<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useBankStore } from './stores/bankStore'
import { useQuizStore } from './stores/quizStore'
import BankList from './components/BankList.vue'
import ImportBank from './components/ImportBank.vue'
import QuizView from './components/QuizView.vue'
import WrongBook from './components/WrongBook.vue'
import StatsView from './components/StatsView.vue'
import SettingsView from './components/SettingsView.vue'

const bankStore = useBankStore()
const quizStore = useQuizStore()

type View = 'home' | 'import' | 'quiz' | 'wrong' | 'stats' | 'settings'
const currentView = ref<View>('home')

onMounted(() => {
  bankStore.initializeBanks()
})

function goTo(view: View) {
  currentView.value = view
}

async function startQuiz(bankIds: number[], mode: 'sequential' | 'random', size: number) {
  await quizStore.startQuiz(bankIds, mode, size)
  currentView.value = 'quiz'
}

function backToHome() {
  currentView.value = 'home'
  bankStore.loadBanks()
}
</script>

<template>
  <div class="app-container">
    <!-- Navigation -->
    <nav class="nav-bar" v-if="currentView !== 'quiz'">
      <div class="nav-brand" @click="goTo('home')">
        <span class="nav-logo">Q</span>
        <span class="nav-title">刷题助手</span>
      </div>
      <div class="nav-links">
        <button :class="{ active: currentView === 'home' }" @click="goTo('home')">题库</button>
        <button :class="{ active: currentView === 'wrong' }" @click="goTo('wrong')">错题本</button>
        <button :class="{ active: currentView === 'stats' }" @click="goTo('stats')">统计</button>
        <button :class="{ active: currentView === 'settings' }" @click="goTo('settings')">设置</button>
      </div>
    </nav>

    <!-- Content -->
    <main>
      <BankList
        v-if="currentView === 'home'"
        @import="goTo('import')"
        @quiz="startQuiz"
      />
      <ImportBank
        v-else-if="currentView === 'import'"
        @done="backToHome"
        @cancel="goTo('home')"
      />
      <QuizView
        v-else-if="currentView === 'quiz'"
        @exit="backToHome"
      />
      <WrongBook
        v-else-if="currentView === 'wrong'"
        @quiz="(bankId, mode, size) => startQuiz([bankId], mode, size)"
      />
      <StatsView v-else-if="currentView === 'stats'" />
      <SettingsView v-else-if="currentView === 'settings'" @done="backToHome" />
    </main>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.nav-logo {
  font-size: 24px;
}

.nav-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--foreground);
}

.nav-links {
  display: flex;
  gap: 4px;
}

.nav-links button {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: var(--muted-foreground);
  transition: all 0.15s;
}

.nav-links button:hover {
  background: var(--accent);
  color: var(--foreground);
}

.nav-links button.active {
  background: var(--primary);
  color: var(--primary-foreground);
}

@media (max-width: 640px) {
  .nav-bar {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .nav-links {
    width: 100%;
    overflow-x: auto;
  }

  .nav-links button {
    flex-shrink: 0;
  }
}
</style>
