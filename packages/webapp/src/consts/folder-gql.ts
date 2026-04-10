import { gql } from '@apollo/client'

export const FOLDERS_GQL = gql`
  query folders($input: FoldersInput!) {
    folders(input: $input) {
      id
      teamId
      projectId
      parentId
      name
      order
    }
  }
`

export const CREATE_FOLDER_GQL = gql`
  mutation createFolder($input: CreateFolderInput!) {
    createFolder(input: $input) {
      id
      teamId
      projectId
      parentId
      name
      order
    }
  }
`

export const UPDATE_FOLDER_GQL = gql`
  mutation updateFolder($input: UpdateFolderInput!) {
    updateFolder(input: $input)
  }
`

export const DELETE_FOLDER_GQL = gql`
  mutation deleteFolder($input: DeleteFolderInput!) {
    deleteFolder(input: $input)
  }
`

export const MOVE_FORMS_TO_FOLDER_GQL = gql`
  mutation moveFormsToFolder($input: MoveFormsToFolderInput!) {
    moveFormsToFolder(input: $input)
  }
`

export const REORDER_FOLDERS_GQL = gql`
  mutation reorderFolders($input: ReorderFoldersInput!) {
    reorderFolders(input: $input)
  }
`
