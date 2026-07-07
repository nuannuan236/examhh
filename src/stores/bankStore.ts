import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { QuestionBank, ImportPreview } from '../types'
import {
  getAllBanks,
  getBankByFileName,
  saveBankToDB,
  deleteBank,
  exportBank,
  repairJudgementQuestions,
} from '../db'
import { BUNDLED_BANKS } from '../bundledBanks'
import { parseXlsxFile } from '../parser'

export const useBankStore = defineStore('bank', () => {
  const banks = ref<QuestionBank[]>([])
  const loading = ref(false)
  const seeding = ref(false)
  const seedError = ref('')
  let initializePromise: Promise<void> | null = null

  async function loadBanks() {
    loading.value = true
    try {
      banks.value = await getAllBanks()
    } finally {
      loading.value = false
    }
  }

  async function seedBundledBanks() {
    seeding.value = true
    seedError.value = ''
    const failures: string[] = []
    try {
      for (const bundledBank of BUNDLED_BANKS) {
        try {
          const existing = await getBankByFileName(bundledBank.fileName)
          if (existing) continue

          const response = await fetch(bundledBank.url)
          if (!response.ok) {
            throw new Error(`文件缺失或部署路径错误（HTTP ${response.status}）`)
          }

          const contentType = response.headers.get('content-type') || ''
          if (contentType.toLowerCase().includes('text/html')) {
            throw new Error('文件缺失或部署路径错误，服务器返回了 HTML 页面')
          }

          const blob = await response.blob()
          if (blob.type.toLowerCase().includes('text/html')) {
            throw new Error('文件缺失或部署路径错误，下载内容不是 Excel')
          }

          const file = new File([blob], bundledBank.fileName, {
            type: blob.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          })
          const preview = await parseXlsxFile(file)
          if (preview.parsedCount === 0) {
            throw new Error('未解析到题目')
          }
          await saveBankToDB(bundledBank.displayName, bundledBank.fileName, preview.questions)
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err)
          failures.push(`${bundledBank.displayName}：${detail}`)
        }
      }
    } catch (err) {
      seedError.value = err instanceof Error ? err.message : String(err)
    } finally {
      if (failures.length > 0) {
        seedError.value = `部分内置题库加载失败：${failures.slice(0, 3).join('；')}${failures.length > 3 ? `；等 ${failures.length} 个` : ''}`
      }
      seeding.value = false
    }
  }

  async function initializeBanks() {
    if (initializePromise) return initializePromise
    initializePromise = (async () => {
      await loadBanks()
      await seedBundledBanks()
      await repairJudgementQuestions()
      await loadBanks()
    })()
    try {
      await initializePromise
    } finally {
      initializePromise = null
    }
  }

  async function importBank(preview: ImportPreview): Promise<number> {
    const bankName = preview.fileName.replace(/\.xlsx$/i, '')
    let bankId: number
    try {
      bankId = await saveBankToDB(bankName, preview.fileName, preview.questions)
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      throw new Error(`导入失败：题库保存失败，请重新选择文件后再试（${detail}）`)
    }
    await loadBanks()
    return bankId
  }

  async function removeBank(bankId: number) {
    await deleteBank(bankId)
    await loadBanks()
  }

  async function doExportBank(bankId: number): Promise<string> {
    return exportBank(bankId)
  }

  return {
    banks,
    loading,
    seeding,
    seedError,
    loadBanks,
    initializeBanks,
    importBank,
    removeBank,
    doExportBank,
  }
})
