import axios from 'axios'
import { create } from 'zustand'

import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface CsvJob {
  jobId: string
  status: string
  progress: number
  totalRows: number
  processedRows: number
  failedRows: number
  formId: string
  fileName: string
}

interface CsvJobState {
  jobs: Map<string, CsvJob>
  pollingIntervals: Map<string, NodeJS.Timeout>

  addJob: (job: CsvJob) => void
  updateJob: (jobId: string, updates: Partial<CsvJob>) => void
  removeJob: (jobId: string) => void
  getJob: (jobId: string) => CsvJob | undefined
  startPolling: (jobId: string) => void
  stopPolling: (jobId: string) => void
  stopAllPolling: () => void
}

export const useCsvJobStore = create<CsvJobState>()(
  devtools(
    immer((set, get) => ({
      jobs: new Map(),
      pollingIntervals: new Map(),

      addJob: (job: CsvJob) => {
        set(state => {
          state.jobs.set(job.jobId, job)
        })
        // Автоматически начинаем polling для новой задачи
        get().startPolling(job.jobId)
      },

      updateJob: (jobId: string, updates: Partial<CsvJob>) => {
        set(state => {
          const job = state.jobs.get(jobId)
          if (job) {
            state.jobs.set(jobId, { ...job, ...updates })
          }
        })

        // Останавливаем polling если задача завершена или провалилась
        const job = get().jobs.get(jobId)
        if (
          job &&
          (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled')
        ) {
          get().stopPolling(jobId)
        }
      },

      removeJob: (jobId: string) => {
        get().stopPolling(jobId)
        set(state => {
          state.jobs.delete(jobId)
        })
      },

      getJob: (jobId: string) => {
        return get().jobs.get(jobId)
      },

      startPolling: (jobId: string) => {
        const { pollingIntervals, stopPolling } = get()

        // Останавливаем существующий polling если есть
        if (pollingIntervals.has(jobId)) {
          stopPolling(jobId)
        }

        const interval = setInterval(async () => {
          try {
            const response = await axios.get(`/api/csv-shorten-job/${jobId}/status`)
            const data = response.data

            get().updateJob(jobId, {
              status: data.status,
              progress: data.progress,
              totalRows: data.totalRows,
              processedRows: data.processedRows,
              failedRows: data.failedRows
            })
          } catch (error) {
            console.error('Failed to fetch job status:', error)
            // При ошибке останавливаем polling
            get().stopPolling(jobId)
          }
        }, 3000) // Проверяем каждые 3 секунды

        set(state => {
          state.pollingIntervals.set(jobId, interval)
        })
      },

      stopPolling: (jobId: string) => {
        const { pollingIntervals } = get()
        const interval = pollingIntervals.get(jobId)

        if (interval) {
          clearInterval(interval)
          set(state => {
            state.pollingIntervals.delete(jobId)
          })
        }
      },

      stopAllPolling: () => {
        const { pollingIntervals } = get()

        pollingIntervals.forEach(interval => {
          clearInterval(interval)
        })

        set(state => {
          state.pollingIntervals.clear()
        })
      }
    })),
    { name: 'CsvJobStore' }
  )
)

// Cleanup при размонтировании приложения
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    useCsvJobStore.getState().stopAllPolling()
  })
}
