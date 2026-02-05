import { FileUploadValue } from '@voxly/shared-types-enums'
import axios from 'axios'

export class UploadService {
  static async upload(file: File): Promise<FileUploadValue> {
    const formData = new FormData()
    formData.append('file', file)

    const result = await axios.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    return result.data
  }
}
