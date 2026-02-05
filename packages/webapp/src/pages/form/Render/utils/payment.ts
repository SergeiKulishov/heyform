import { FieldKindEnum, FormField, FormModel } from '@voxly/shared-types-enums'

import { helper } from '@voxly/utils'

export function isStripeEnabled(form: Any): boolean {
  return helper.isValid(form.stripe?.accountId) && !!getPaymentField(form)
}

export function getPaymentField(form: FormModel): FormField | undefined {
  return form.fields?.find(f => f.kind === FieldKindEnum.PAYMENT)
}
