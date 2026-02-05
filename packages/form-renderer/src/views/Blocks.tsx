import { FieldKindEnum, FormField } from '@voxly/shared-types-enums'
import type { FC } from 'react'
import { useCallback, useEffect, useMemo } from 'react'

import { useTranslation } from '../utils'
import { helper } from '@voxly/utils'

import { Address } from '../blocks/Address'
import { Country } from '../blocks/Country'
import { Date } from '../blocks/Date'
import { DateRange } from '../blocks/DateRange'
import { Email } from '../blocks/Email'
import { FileUpload } from '../blocks/FileUpload'
import { FullName } from '../blocks/FullName'
import { InputTable } from '../blocks/InputTable'
import { LegalTerms } from '../blocks/LegalTerms'
import { LongText } from '../blocks/LongText'
import { MultipleChoice } from '../blocks/MultipleChoice'
import { Number } from '../blocks/Number'
import { OpinionScale } from '../blocks/OpinionScale'
import { Payment } from '../blocks/Payment'
import { PhoneNumber } from '../blocks/PhoneNumber'
import { PictureChoice } from '../blocks/PictureChoice'
import { Rating } from '../blocks/Rating'
import { ShortText } from '../blocks/ShortText'
import { Signature } from '../blocks/Signature'
import { Statement } from '../blocks/Statement'
import { ThankYou } from '../blocks/ThankYou'
import { Website } from '../blocks/Website'
import { Welcome } from '../blocks/Welcome'
import { YesNo } from '../blocks/YesNo'
import { useStore } from '../store'
import { Footer } from './Footer'
import { Header } from './Header'

function getBlock(field: FormField, blockIndex?: number) {
  switch (field.kind) {
    case FieldKindEnum.ADDRESS:
      return <Address key={field.id} field={field} />

    case FieldKindEnum.COUNTRY:
      return <Country key={field.id} field={field} />

    case FieldKindEnum.FULL_NAME:
      return <FullName key={field.id} field={field} />

    case FieldKindEnum.DATE:
      return <Date key={field.id} field={field} />

    case FieldKindEnum.DATE_RANGE:
      return <DateRange key={field.id} field={field} />

    case FieldKindEnum.EMAIL:
      return <Email key={field.id} field={field} />

    case FieldKindEnum.FILE_UPLOAD:
      return <FileUpload key={field.id} field={field} />

    case FieldKindEnum.MULTIPLE_CHOICE:
      return <MultipleChoice key={field.id} field={field} />

    case FieldKindEnum.NUMBER:
      return <Number key={field.id} field={field} />

    case FieldKindEnum.OPINION_SCALE:
      return <OpinionScale key={field.id} field={field} />

    case FieldKindEnum.PHONE_NUMBER:
      return <PhoneNumber key={field.id} field={field} />

    case FieldKindEnum.PICTURE_CHOICE:
      return <PictureChoice key={field.id} field={field} />

    case FieldKindEnum.RATING:
      return <Rating key={field.id} field={field} />

    case FieldKindEnum.URL:
      return <Website key={field.id} field={field} />

    case FieldKindEnum.YES_NO:
      return <YesNo key={field.id} field={field} />

    case FieldKindEnum.LONG_TEXT:
      return <LongText key={field.id} field={field} />

    case FieldKindEnum.SIGNATURE:
      return <Signature key={field.id} field={field} />

    case FieldKindEnum.LEGAL_TERMS:
      return <LegalTerms key={field.id} field={field} />

    case FieldKindEnum.INPUT_TABLE:
      return <InputTable key={field.id} field={field} />

    case FieldKindEnum.SHORT_TEXT:
      return <ShortText key={field.id} field={field} />

    case FieldKindEnum.PAYMENT:
      return <Payment key={field.id} field={field} paymentBlockIndex={blockIndex} />

    default:
      return <Statement key={field.id} field={field} />
  }
}

const Main: FC = () => {
  const { state } = useStore()
  const paymentIndex = useMemo(
    () => state.fields.findIndex(field => field.kind === FieldKindEnum.PAYMENT),
    []
  )
  const currentField = useMemo(
    () => getBlock(state.fields[state.scrollIndex!]),
    [state.scrollIndex]
  )

  if (paymentIndex > -1) {
    const paymentBlock = getBlock(state.fields[paymentIndex], paymentIndex)

    return (
      <>
        {state.scrollIndex! < paymentIndex && currentField}
        {paymentBlock}
        {state.scrollIndex! > paymentIndex && currentField}
      </>
    )
  }

  return currentField
}

export const Blocks = () => {
  const { state } = useStore()
  const { t } = useTranslation()

  function handleResize() {
    if (window.heyform.device.android) {
      document.activeElement?.scrollIntoView()
    }
  }

  // Send partial submission when user leaves the page
  const handleBeforeUnload = useCallback(() => {
    // Skip if already submitted or submitting
    if (state.isSubmitted || state.isSubmitting) {
      return
    }

    // Skip if partial submission is disabled
    if (state.settings?.enablePartialSubmission === false) {
      return
    }

    // Skip if no answers
    if (!helper.isValid(state.values) || Object.keys(state.values).length === 0) {
      return
    }

    // Get hidden field values
    const hiddenFieldValues =
      state.hiddenFields?.map(hf => ({
        id: hf.id,
        name: hf.name,
        value: state.query[hf.name]
      })) || []

    // Get current field info
    const currentField = state.fields[state.scrollIndex!]
    const lastFieldId = currentField?.id
    const lastFieldIndex = state.scrollIndex

    // Prepare partial submission data
    const partialData = {
      formId: state.formId,
      sessionId: state.sessionId,
      answers: state.values,
      hiddenFields: hiddenFieldValues,
      lastFieldId,
      lastFieldIndex
    }

    // Use sendBeacon for reliable transmission during page unload
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(partialData)], { type: 'application/json' })
      navigator.sendBeacon('/api/partial-submission', blob)
    }
  }, [
    state.isSubmitted,
    state.isSubmitting,
    state.values,
    state.formId,
    state.sessionId,
    state.scrollIndex,
    state.fields,
    state.hiddenFields,
    state.query,
    state.settings
  ])

  useEffect(() => {
    window.addEventListener('resize', handleResize, false)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('resize', handleResize, false)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [handleBeforeUnload])

  if (!state.isStarted && state.welcomeField) {
    return <Welcome field={state.welcomeField} />
  }

  if (state.isSubmitted) {
    const thankYouField = state.thankYouFields?.find(f => f.id === state.thankYouFieldId)

    const field: any = thankYouField || {
      title: t('Thank you!'),
      description: t('Thanks for completing this form. Now create your own form.'),
      properties: {
        buttonText: t('Create a heyform')
      }
    }

    return <ThankYou field={field} />
  }

  return (
    <>
      <Header />
      <Main />
      <Footer />
    </>
  )
}
