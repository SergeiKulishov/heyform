import { Answer } from '@voxly/shared-types-enums'

import { parsePlainAnswer } from './answer-to-plain'

export function answersToApiObject(answers: Answer[]): Record<string, any> {
  const result: Record<string, any> = {}

  answers.forEach(answer => {
    const key = `(ID: ${answer.id}) ${answer.title}`
    result[key] = parsePlainAnswer(answer)
  })

  return result
}
