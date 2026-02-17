import { IconSend2, IconSparkles, IconX } from '@tabler/icons-react'
import { useRequest } from 'ahooks'
import { FC, KeyboardEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FormService } from '@/services'
import { useParam } from '@/utils'

import IconAI from '@/assets/ai.svg?react'
import { Button, Loader, Tooltip } from '@/components'

import { useStoreContext } from '../store'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

interface AiAssistantPanelProps {
  onClose: () => void
}

const AiAssistantPanel: FC<AiAssistantPanelProps> = ({ onClose }) => {
  const { t } = useTranslation()
  const { formId } = useParam()
  const { dispatch } = useStoreContext()

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: t('form.chat.welcome') }
  ])
  // history stores only actual user/assistant exchanges (excluding the initial welcome message)
  const [history, setHistory] = useState<Array<{ role: string; content: string }>>([])

  const { loading, run } = useRequest(
    async (text: string) => {
      const newFields = await FormService.createFieldsWithAI(formId, text, history)

      if (newFields && Array.isArray(newFields)) {
        const assistantReply = t('form.chat.fieldsUpdated')
        dispatch({ type: 'setFields', payload: { fields: newFields } })
        setMessages(prev => [
          ...prev,
          { role: 'user', text },
          { role: 'assistant', text: assistantReply }
        ])
        setHistory(prev => [
          ...prev,
          { role: 'user', content: text },
          { role: 'assistant', content: assistantReply }
        ])
      }
    },
    {
      manual: true,
      onError: (err: any) => {
        const errText = err?.message || t('components.error.title')
        setMessages(prev => [...prev, { role: 'assistant', text: errText }])
      }
    }
  )

  function handleSend() {
    const text = prompt.trim()

    if (!text || loading) return

    setPrompt('')
    run(text)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="bg-foreground ring-accent-light flex h-full flex-col rounded-xl ring-1">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <IconAI className="h-5 w-5" />
          <span className="text-sm font-semibold">{t('form.chat.title')}</span>
        </div>
        <Button.Link size="sm" iconOnly onClick={onClose}>
          <IconX className="h-4 w-4" />
        </Button.Link>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={
              msg.role === 'user'
                ? 'ml-4 self-end rounded-xl bg-blue-600 px-3 py-2 text-sm text-white'
                : 'mr-4 self-start rounded-xl bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800'
            }
          >
            {msg.text}
          </div>
        ))}

        {loading && (
          <div className="mr-4 flex items-center gap-2 self-start rounded-xl bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800">
            <Loader className="h-4 w-4" />
            <span className="text-secondary">...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 border-t p-3">
        <textarea
          ref={inputRef}
          className="text-primary placeholder:text-secondary flex-1 resize-none rounded-lg bg-transparent px-2 py-1.5 text-sm outline-none"
          rows={2}
          placeholder={t('form.chat.compose')}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <Button size="sm" iconOnly disabled={!prompt.trim() || loading} onClick={handleSend}>
          {loading ? <Loader className="h-4 w-4" /> : <IconSend2 className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

interface AiAssistantButtonProps {
  isOpen: boolean
  onClick: () => void
}

export const AiAssistantButton: FC<AiAssistantButtonProps> = ({ isOpen, onClick }) => {
  const { t } = useTranslation()

  return (
    <Tooltip label={t('form.chat.title')}>
      <Button.Link size="md" iconOnly className={isOpen ? 'text-primary' : ''} onClick={onClick}>
        <IconSparkles className="h-5 w-5" />
      </Button.Link>
    </Tooltip>
  )
}

export default AiAssistantPanel
