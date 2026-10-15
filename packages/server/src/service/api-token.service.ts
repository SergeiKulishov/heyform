import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import * as crypto from 'crypto'
import { Model } from 'mongoose'

import { ApiTokenModel } from '@model'

@Injectable()
export class ApiTokenService {
  constructor(
    @InjectModel(ApiTokenModel.name) private readonly apiTokenModel: Model<ApiTokenModel>
  ) {}

  async create(
    teamId: string,
    userId: string,
    name: string,
    scope: string
  ): Promise<{ record: ApiTokenModel; token: string }> {
    const token = 'hfm_' + crypto.randomBytes(24).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const prefix = token.slice(0, 11)

    const record = await this.apiTokenModel.create({
      teamId,
      userId,
      name,
      scope,
      tokenHash,
      prefix
    })

    return { record, token }
  }

  async findByTeam(teamId: string): Promise<ApiTokenModel[]> {
    return this.apiTokenModel
      .find({
        teamId,
        revokedAt: { $exists: false }
      })
      .sort({ createdAt: -1 })
  }

  async revoke(teamId: string, id: string): Promise<boolean> {
    const result = await this.apiTokenModel.updateOne(
      {
        _id: id,
        teamId
      },
      {
        revokedAt: new Date()
      }
    )

    return !!result.ok
  }

  async verify(token: string): Promise<ApiTokenModel | null> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const record = await this.apiTokenModel.findOne({
      tokenHash,
      revokedAt: { $exists: false }
    })

    if (!record) {
      return null
    }

    const shouldUpdate = !record.lastUsedAt || Date.now() - record.lastUsedAt.getTime() > 60000

    if (shouldUpdate) {
      await this.apiTokenModel.updateOne(
        {
          _id: record.id
        },
        {
          lastUsedAt: new Date()
        }
      )
    }

    return record
  }
}
