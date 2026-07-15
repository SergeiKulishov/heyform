import {
  MongooseModuleOptions,
  MongooseOptionsFactory
} from '@nestjs/mongoose/dist/interfaces/mongoose-options.interface'
import * as mongoose from 'mongoose'

import { MONGO_PASSWORD, MONGO_SSL_CA_PATH, MONGO_URI, MONGO_USER, NODE_ENV } from '@environments'
import { Logger } from '@utils'
import { clone } from '@voxly/utils'

// Setup migrations logger
const logger = new Logger('MongooseModule')

if (NODE_ENV !== 'production') {
  mongoose.set('debug', (collection: string, method: string, query: any, doc: any) => {
    const newQuery = clone(query)

    // Hide passwords from query logs
    if (newQuery.password) {
      newQuery.password = '******'
    }

    logger.info([collection, method, JSON.stringify(newQuery), JSON.stringify(doc)].join(' '))
  })
}

export class MongoService implements MongooseOptionsFactory {
  createMongooseOptions(): Promise<MongooseModuleOptions> | MongooseModuleOptions {
    return {
      uri: MONGO_URI,
      user: MONGO_USER,
      pass: MONGO_PASSWORD,
      sslCA: MONGO_SSL_CA_PATH,
      useNewUrlParser: true,
      useFindAndModify: false,
      useCreateIndex: true,
      useUnifiedTopology: true,
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    }
  }
}
