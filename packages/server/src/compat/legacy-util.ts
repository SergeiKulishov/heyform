import * as util from 'util'

type LegacyUtil = Record<string, (value: unknown) => boolean>

const legacyFunctions: LegacyUtil = {
  isString: value => typeof value === 'string',
  isNumber: value => typeof value === 'number',
  isBoolean: value => typeof value === 'boolean',
  isFunction: value => typeof value === 'function',
  isSymbol: value => typeof value === 'symbol',
  isUndefined: value => value === undefined,
  isNull: value => value === null,
  isNullOrUndefined: value => value === null || value === undefined,
  isObject: value => typeof value === 'object' && value !== null,
  isDate: value => util.types.isDate(value),
  isRegExp: value => util.types.isRegExp(value),
  isError: value => util.types.isNativeError(value),
  isBuffer: value => Buffer.isBuffer(value)
}

export function patchLegacyUtil(): void {
  const target = util as unknown as LegacyUtil

  Object.entries(legacyFunctions).forEach(([name, implementation]) => {
    if (typeof target[name] !== 'function') {
      target[name] = implementation
    }
  })
}
