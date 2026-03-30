import { InjectQueue } from '@nestjs/bull'
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { FileInterceptor } from '@nestjs/platform-express'
import { Queue } from 'bull'
import { Response } from 'express'
import * as fs from 'fs-extra'
import { Model } from 'mongoose'
import { diskStorage } from 'multer'
import * as path from 'path'

import { Auth, User as UserDecorator } from '@decorator'
import { CsvShortenJobModel, CsvShortenJobStatus, UserModel } from '@model'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'csv-shorten')

@Controller()
@Auth()
export class CsvShortenController {
  constructor(
    @InjectQueue('CsvShortenQueue') private readonly csvShortenQueue: Queue,
    @InjectModel(CsvShortenJobModel.name)
    private readonly csvShortenJobModel: Model<CsvShortenJobModel>
  ) {}

  @Post('/api/csv-shorten-job')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: async (req, file, cb) => {
          await fs.ensureDir(UPLOAD_DIR)
          cb(null, UPLOAD_DIR)
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
          cb(null, `upload-${uniqueSuffix}.csv`)
        }
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
          cb(new BadRequestException('Only CSV files are allowed'), false)
        } else {
          cb(null, true)
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max
      }
    })
  )
  async createJob(
    @UserDecorator() user: UserModel,
    @UploadedFile() file: Express.Multer.File,
    @Body('formId') formId: string,
    @Body('teamId') teamId: string,
    @Body('baseUrl') baseUrl: string,
    @Body('useUrlShortener') useUrlShortener: string
  ): Promise<{ jobId: string }> {
    if (!file) {
      throw new BadRequestException('CSV file is required')
    }

    if (!formId || !baseUrl) {
      throw new BadRequestException('formId and baseUrl are required')
    }

    const csvContent = await fs.readFile(file.path, 'utf-8')
    const shouldShortenUrls = useUrlShortener === 'true'

    const job = await this.csvShortenJobModel.create({
      userId: user.id,
      formId,
      fileName: file.originalname,
      status: CsvShortenJobStatus.PENDING,
      useUrlShortener: shouldShortenUrls,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    })

    await this.csvShortenQueue.add({
      jobId: job.id,
      formId,
      teamId: teamId || '',
      csvContent,
      baseUrl,
      uploadDir: UPLOAD_DIR,
      originalFileName: file.originalname
    })

    await fs.remove(file.path)

    return { jobId: job.id }
  }

  @Get('/api/csv-shorten-job/:jobId/status')
  async getJobStatus(
    @UserDecorator() user: UserModel,
    @Param('jobId') jobId: string
  ): Promise<{
    status: CsvShortenJobStatus
    progress: number
    totalRows: number
    processedRows: number
    failedRows: number
    errorMessage?: string
    fileReady: boolean
  }> {
    const job = await this.csvShortenJobModel.findById(jobId)

    if (!job) {
      throw new NotFoundException('Job not found')
    }

    if (job.userId !== user.id) {
      throw new BadRequestException('Access denied')
    }

    const progress = job.totalRows > 0 ? Math.round((job.processedRows / job.totalRows) * 100) : 0

    return {
      status: job.status,
      progress,
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      failedRows: job.failedRows,
      errorMessage: job.errorMessage,
      fileReady: job.status === CsvShortenJobStatus.COMPLETED && !!job.filePath
    }
  }

  @Get('/api/csv-shorten-job/:jobId/download')
  async downloadFile(
    @UserDecorator() user: UserModel,
    @Param('jobId') jobId: string,
    @Res() res: Response
  ): Promise<void> {
    const job = await this.csvShortenJobModel.findById(jobId)

    if (!job) {
      throw new NotFoundException('Job not found')
    }

    if (job.userId !== user.id) {
      throw new BadRequestException('Access denied')
    }

    if (job.status !== CsvShortenJobStatus.COMPLETED || !job.filePath) {
      throw new BadRequestException('File is not ready yet')
    }

    const filePath = path.join(UPLOAD_DIR, job.filePath)

    if (!(await fs.pathExists(filePath))) {
      throw new NotFoundException('File not found')
    }

    const downloadFileName = job.resultFileName || job.fileName
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`)

    const fileStream = fs.createReadStream(filePath)
    fileStream.pipe(res)
  }

  @Post('/api/csv-shorten-job/:jobId/cancel')
  async cancelJob(
    @UserDecorator() user: UserModel,
    @Param('jobId') jobId: string
  ): Promise<{ success: boolean }> {
    const job = await this.csvShortenJobModel.findById(jobId)

    if (!job) {
      throw new NotFoundException('Job not found')
    }

    if (job.userId !== user.id) {
      throw new BadRequestException('Access denied')
    }

    if (job.status === CsvShortenJobStatus.COMPLETED || job.status === CsvShortenJobStatus.FAILED) {
      throw new BadRequestException('Cannot cancel completed or failed job')
    }

    await this.csvShortenJobModel.findByIdAndUpdate(jobId, {
      status: CsvShortenJobStatus.CANCELLED
    })

    return { success: true }
  }
}
