import { FC, ReactNode } from 'react'

import { helper } from '@voxly/utils'

type RepeatChildren = (index: number) => ReactNode

interface RepeatProps extends Omit<ComponentProps, 'children'> {
  count: number
  children: ReactNode | RepeatChildren
}

export const Repeat: FC<RepeatProps> = ({ count, children }) => {
  return Array.from({ length: count }, (_, index) =>
    helper.isFunction(children) ? (children as RepeatChildren)(index) : (children as ReactNode)
  )
}
