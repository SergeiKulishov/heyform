import { useTranslation } from '@voxly/form-renderer/src'
import clsx from 'clsx'
import type { FC } from 'react'
import { useMemo } from 'react'

import { Button, ButtonProps } from './Button'

interface PaginationProps {
  className?: string
  total: number
  page: number
  pageSize: number
  loading?: boolean
  buttonProps?: ButtonProps
  onChange?: (page: number) => void
}

export const Pagination: FC<PaginationProps> = ({
  className,
  total,
  page = 1,
  pageSize = 10,
  loading,
  buttonProps,
  onChange
}) => {
  const { t } = useTranslation()

  const maxPage = useMemo(() => Math.ceil(total / pageSize), [total, pageSize])

  function handlePrevious() {
    onChange?.(page - 1)
  }

  function handleNext() {
    onChange?.(page + 1)
  }

  if (maxPage <= 1) {
    return null
  }

  return (
    <nav
      className={clsx('flex items-center justify-between gap-x-4', className)}
      aria-label="pagination"
    >
      <div className="text-primary hidden text-sm/6 sm:block" data-slot="info">
        {t('paginationTitle', { page, maxPage })}
      </div>

      <div className="flex flex-1 justify-between gap-x-3 sm:justify-end" data-slot="buttons">
        <Button.Ghost
          size="md"
          {...buttonProps}
          data-slot="previous"
          disabled={page <= 1 || loading}
          onClick={handlePrevious}
        >
          {t('paginationPrevious')}
        </Button.Ghost>
        <Button.Ghost
          size="md"
          {...buttonProps}
          data-slot="next"
          disabled={page >= maxPage || loading}
          onClick={handleNext}
        >
          {t('paginationNext')}
        </Button.Ghost>
      </div>
    </nav>
  )
}
