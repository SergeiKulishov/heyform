import { apollo } from '@/utils'

import {
  CREATE_FOLDER_GQL,
  DELETE_FOLDER_GQL,
  FOLDERS_GQL,
  MOVE_FORMS_TO_FOLDER_GQL,
  REORDER_FOLDERS_GQL,
  UPDATE_FOLDER_GQL
} from '@/consts'
import { FolderType } from '@/types'

export class FolderService {
  static async folders(projectId: string): Promise<FolderType[]> {
    const result = await apollo.query<FolderType[]>({
      query: FOLDERS_GQL,
      variables: {
        input: {
          projectId
        }
      },
      fetchPolicy: 'network-only'
    })
    return result || []
  }

  static async create(input: {
    projectId: string
    name: string
    parentId?: string
  }): Promise<FolderType> {
    return apollo.mutate<FolderType>({
      mutation: CREATE_FOLDER_GQL,
      variables: {
        input
      }
    })
  }

  static async update(projectId: string, folderId: string, name: string): Promise<boolean> {
    const result = await apollo.mutate<boolean>({
      mutation: UPDATE_FOLDER_GQL,
      variables: {
        input: {
          projectId,
          folderId,
          name
        }
      }
    })
    return result ?? false
  }

  static async delete(projectId: string, folderId: string): Promise<boolean> {
    const result = await apollo.mutate<boolean>({
      mutation: DELETE_FOLDER_GQL,
      variables: {
        input: {
          projectId,
          folderId
        }
      }
    })
    return result ?? false
  }

  static async moveFormsToFolder(
    projectId: string,
    formIds: string[],
    folderId: string | null
  ): Promise<boolean> {
    const result = await apollo.mutate<boolean>({
      mutation: MOVE_FORMS_TO_FOLDER_GQL,
      variables: {
        input: {
          projectId,
          formIds,
          folderId
        }
      }
    })
    return result ?? false
  }

  static async reorder(projectId: string, folderIds: string[]): Promise<boolean> {
    const result = await apollo.mutate<boolean>({
      mutation: REORDER_FOLDERS_GQL,
      variables: {
        input: {
          projectId,
          folderIds
        }
      }
    })
    return result ?? false
  }
}
