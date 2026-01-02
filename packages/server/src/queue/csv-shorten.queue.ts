import { Process, Processor } from '@nestjs/bull'
import { InjectModel } from '@nestjs/mongoose'
import axios from 'axios'
import { Job } from 'bull'
import * as fs from 'fs-extra'
import { Model } from 'mongoose'
import * as path from 'path'

import { CsvShortenJobModel, CsvShortenJobStatus } from '@model'

import { BaseQueue } from './base.queue'

export interface CsvShortenQueueJob {
  jobId: string
  csvContent: string
  baseUrl: string
  uploadDir: string
  originalFileName: string
}

@Processor('CsvShortenQueue')
export class CsvShortenQueue extends BaseQueue {
  private readonly BATCH_SIZE = 50
  private readonly KUTT_API_URL =
    process.env.KUTT_API_URL || 'https://kutt-swww4os08c08g8wkskk0sgwo.stackbro.tech/api/v2'
  private readonly KUTT_API_KEY = process.env.KUTT_API_KEY || ''
  private readonly RETRY_ATTEMPTS = 3
  private readonly RETRY_DELAY = 2000

  constructor(
    @InjectModel(CsvShortenJobModel.name)
    private readonly csvShortenJobModel: Model<CsvShortenJobModel>
  ) {
    super()
  }

  @Process()
  async process(job: Job<CsvShortenQueueJob>): Promise<void> {
    const { jobId, csvContent, baseUrl, uploadDir, originalFileName } = job.data

    try {
      // Get job to check useUrlShortener flag
      const currentJob = await this.csvShortenJobModel.findById(jobId)
      if (!currentJob) {
        throw new Error('Job not found')
      }

      await this.csvShortenJobModel.findByIdAndUpdate(jobId, {
        status: CsvShortenJobStatus.PROCESSING
      })

      const rows = this.parseCSV(csvContent)
      if (rows.length < 2) {
        throw new Error('CSV file must contain at least header and one data row')
      }

      const headers = rows[0]
      const dataRows = rows.slice(1)

      await this.csvShortenJobModel.findByIdAndUpdate(jobId, {
        totalRows: dataRows.length
      })

      const useUrlShortener = currentJob.useUrlShortener

      const linksToShorten: string[] = []
      const originalData: any[] = []

      for (const row of dataRows) {
        const searchParams = new URLSearchParams()
        headers.forEach((header, index) => {
          if (header && row[index] !== undefined) {
            searchParams.append(header, row[index])
          }
        })
        const generatedLink = `${baseUrl}?${searchParams.toString()}`
        linksToShorten.push(generatedLink)
        originalData.push(row)
      }

      const shortenedLinks: string[] = []
      let processedCount = 0
      let failedCount = 0

      for (let i = 0; i < linksToShorten.length; i += this.BATCH_SIZE) {
        const jobCheck = await this.csvShortenJobModel.findById(jobId)
        if (jobCheck?.status === CsvShortenJobStatus.CANCELLED) {
          this.logger.info(`Job ${jobId} was cancelled`)
          return
        }

        const batch = linksToShorten.slice(i, i + this.BATCH_SIZE)

        // Only shorten URLs if useUrlShortener flag is enabled
        let batchResults: Array<{ status: 'fulfilled' | 'rejected'; value?: string; reason?: any }>

        if (useUrlShortener) {
          // Promise.allSettled equivalent for older TypeScript versions
          const batchPromises = batch.map(link =>
            this.shortenUrlWithRetry(link)
              .then(value => ({ status: 'fulfilled' as const, value }))
              .catch(error => ({ status: 'rejected' as const, reason: error }))
          )
          batchResults = await Promise.all(batchPromises)
        } else {
          // Skip shortening, return empty strings
          batchResults = batch.map(() => ({ status: 'fulfilled' as const, value: '' }))
        }

        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            // Если сокращение включено, проверяем что value не пустое
            if (useUrlShortener && !result.value) {
              shortenedLinks.push('')
              failedCount++
              this.logger.error('Failed to shorten URL: Empty result')
            } else {
              shortenedLinks.push(result.value || '')
            }
          } else {
            // Реальная ошибка (rejected)
            shortenedLinks.push('')
            failedCount++
            this.logger.error(`Failed to shorten URL: ${result.reason?.message || 'Unknown error'}`)
          }
          processedCount++
        }

        await this.csvShortenJobModel.findByIdAndUpdate(jobId, {
          processedRows: processedCount,
          failedRows: failedCount
        })

        if (i + this.BATCH_SIZE < linksToShorten.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      // Format output based on useUrlShortener flag
      const outputRows = originalData.map((row, index) => {
        if (useUrlShortener) {
          return [...row, linksToShorten[index], shortenedLinks[index]]
        } else {
          return [...row, linksToShorten[index]]
        }
      })

      const outputHeaders = useUrlShortener
        ? [...headers, 'generated_link', 'shortened_link']
        : [...headers, 'generated_link']
      const csvOutput = this.generateCSV(outputHeaders, outputRows)

      const resultFileName = this.generateResultFileName(originalFileName)
      const uniqueFileName = `${Date.now()}_${resultFileName}`
      const filePath = path.join(uploadDir, uniqueFileName)
      await fs.ensureDir(uploadDir)
      await fs.writeFile(filePath, csvOutput, 'utf-8')

      await this.csvShortenJobModel.findByIdAndUpdate(jobId, {
        status: CsvShortenJobStatus.COMPLETED,
        filePath: uniqueFileName,
        resultFileName: resultFileName,
        completedAt: new Date()
      })

      this.logger.info(
        `Job ${jobId} completed successfully. Processed: ${processedCount}, Failed: ${failedCount}`
      )
    } catch (error: any) {
      this.logger.error(`Job ${jobId} failed:`, error)

      await this.csvShortenJobModel.findByIdAndUpdate(jobId, {
        status: CsvShortenJobStatus.FAILED,
        errorMessage: error.message || 'Unknown error occurred'
      })

      throw error
    }
  }

  private async shortenUrlWithRetry(url: string): Promise<string> {
    for (let attempt = 0; attempt < this.RETRY_ATTEMPTS; attempt++) {
      try {
        const response = await axios.post(
          `${this.KUTT_API_URL}/links`,
          { target: url },
          {
            headers: {
              'X-API-Key': this.KUTT_API_KEY,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        )
        return response.data.link
      } catch (error: any) {
        if (attempt === this.RETRY_ATTEMPTS - 1) {
          throw error
        }
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * Math.pow(2, attempt)))
      }
    }
    throw new Error('Max retry attempts exceeded')
  }

  private parseCSV(content: string): string[][] {
    const lines = content.trim().split('\n')
    return lines.map(line => {
      const values: string[] = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim())
      return values
    })
  }

  private generateCSV(headers: string[], rows: string[][]): string {
    const escapeCsvValue = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }

    const lines = [
      headers.map(escapeCsvValue).join(','),
      ...rows.map(row => row.map(escapeCsvValue).join(','))
    ]
    return lines.join('\n')
  }

  /**
   * Generate a safe result filename from original filename.
   * Adds _result suffix and sanitizes for Windows/macOS compatibility.
   */
  private generateResultFileName(originalFileName: string): string {
    // Get name without extension
    const ext = path.extname(originalFileName)
    const baseName = path.basename(originalFileName, ext)

    // Sanitize: remove characters not allowed on Windows/macOS
    // Windows forbidden: < > : " / \ | ? *
    // Also remove control characters and leading/trailing spaces/dots
    let sanitized = baseName
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Replace forbidden chars with underscore
      .replace(/^[\s.]+|[\s.]+$/g, '') // Remove leading/trailing spaces and dots
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Collapse multiple underscores

    // Ensure we have a valid name
    if (!sanitized) {
      sanitized = 'file'
    }

    // Truncate if too long (max 200 chars for base name to be safe)
    if (sanitized.length > 200) {
      sanitized = sanitized.substring(0, 200)
    }

    return `${sanitized}_result${ext || '.csv'}`
  }
}
