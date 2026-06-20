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
    try {
      for (const bundledBank of BUNDLED_BANKS) {
        const existing = await getBankByFileName(bundledBank.fileName)
        if (existing) continue

        const response = await fetch(bundledBank.url)
        if (!response.ok) {
          throw new Error(`无法读取内置题库 ${bundledBank.fileName}`)
        }

        const blob = await response.blob()
        const file = new File([blob], bundledBank.fileName, {
          type: blob.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        const preview = await parseXlsxFile(file)
        if (preview.parsedCount === 0) {
          throw new Error(`内置题库 ${bundledBank.fileName} 未解析到题目`)
        }
        await saveBankToDB(bundledBank.fileName.replace(/\.xlsx$/i, ''), bundledBank.fileName, preview.questions)
      }
    } catch (err) {
      seedError.value = err instanceof Error ? err.message : String(err)
    } finally {
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
