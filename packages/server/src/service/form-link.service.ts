import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import axios from 'axios'
import { Model } from 'mongoose'

import { FormLinkModel } from '@model'

interface CreateFormLinkData {
  formId: string
  teamId: string
  kuttId: string
  shortLink: string
  target: string
  source: 'manual' | 'csv'
}

export interface KuttStatsNameValue {
  name: string
  value: number
}

export interface KuttStatsPeriod {
  browser: KuttStatsNameValue[]
  os: KuttStatsNameValue[]
  country: KuttStatsNameValue[]
  referrer: KuttStatsNameValue[]
  views: number[]
}

export interface KuttLinkStats {
  visitCount: number
  lastDay: KuttStatsPeriod
  lastWeek: KuttStatsPeriod
  lastMonth: KuttStatsPeriod
}

@Injectable()
export class FormLinkService {
  private readonly KUTT_API_URL =
    process.env.KUTT_API_URL || 'https://kutt-swww4os08c08g8wkskk0sgwo.stackbro.tech/api/v2'
  private readonly KUTT_API_KEY = process.env.KUTT_API_KEY || ''

  constructor(
    @InjectModel(FormLinkModel.name)
    private readonly formLinkModel: Model<FormLinkModel>
  ) {}

  async create(data: CreateFormLinkData): Promise<FormLinkModel> {
    return this.formLinkModel.create(data)
  }

  async findByFormId(formId: string): Promise<FormLinkModel[]> {
    return this.formLinkModel.find({ formId }).sort({ createdAt: -1 })
  }

  async findById(id: string): Promise<FormLinkModel | null> {
    return this.formLinkModel.findById(id)
  }

  async delete(id: string): Promise<void> {
    const link = await this.formLinkModel.findById(id)
    if (!link) return

    if (this.KUTT_API_KEY && link.kuttId) {
      try {
        await axios.delete(`${this.KUTT_API_URL}/links/${link.kuttId}`, {
          headers: { 'X-API-Key': this.KUTT_API_KEY }
        })
      } catch (error: any) {
        // Deletion from Kutt failed — still remove locally
      }
    }

    await this.formLinkModel.findByIdAndDelete(id)
  }

  async getKuttVisitCounts(kuttIds: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>()
    kuttIds.forEach(id => result.set(id, 0))

    if (!this.KUTT_API_KEY || kuttIds.length === 0) {
      return result
    }

    try {
      const response = await axios.get(`${this.KUTT_API_URL}/links`, {
        headers: { 'X-API-Key': this.KUTT_API_KEY },
        params: { limit: 100 },
        timeout: 8000
      })
      const links: any[] = response.data.data ?? []
      for (const link of links) {
        if (result.has(link.id)) {
          result.set(link.id, link.visit_count ?? 0)
        }
      }
    } catch {
      // return zeros on error
    }

    return result
  }

  async getKuttLinkStats(kuttId: string): Promise<KuttLinkStats | null> {
    if (!this.KUTT_API_KEY || !kuttId) {
      return null
    }

    try {
      const response = await axios.get(`${this.KUTT_API_URL}/links/${kuttId}/stats`, {
        headers: { 'X-API-Key': this.KUTT_API_KEY },
        timeout: 8000
      })

      const data = response.data
      const emptyPeriod: KuttStatsPeriod = {
        browser: [],
        os: [],
        country: [],
        referrer: [],
        views: []
      }

      function mapPeriod(raw: any): KuttStatsPeriod {
        if (!raw) return emptyPeriod
        return {
          browser: raw.stats?.browser ?? [],
          os: raw.stats?.os ?? [],
          country: raw.stats?.country ?? [],
          referrer: raw.stats?.referrer ?? [],
          views: raw.views ?? []
        }
      }

      return {
        visitCount: data.visit_count ?? 0,
        lastDay: mapPeriod(data.lastDay),
        lastWeek: mapPeriod(data.lastWeek),
        lastMonth: mapPeriod(data.lastMonth)
      }
    } catch {
      return null
    }
  }
}
