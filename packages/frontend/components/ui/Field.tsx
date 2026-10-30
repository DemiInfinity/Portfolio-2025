import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

type State = 'default' | 'error' | 'ok'

type BaseProps = {
  label: string
  hint?: string
  state?: State
}

type InputFieldProps = BaseProps & { multiline?: false } & InputHTMLAttributes<HTMLInputElement>
type TextareaFieldProps = BaseProps & { multiline: true } & TextareaHTMLAttributes<HTMLTextAreaElement>

function inputClass(state: State | undefined) {
  return ['input', state === 'error' && 'err', state === 'ok' && 'ok'].filter(Boolean).join(' ')
}

/** Label + input/textarea + hint (Interactions "Form fields"). The hint is linked by aria-describedby. */
const Field = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputFieldProps | TextareaFieldProps>(
  function Field(props, ref) {
    const autoId = useId()
    const hintId = `${autoId}-hint`
    const inputId = (props.id as string | undefined) ?? `${autoId}-input`
    const { label, hint, state, multiline, ...rest } = props as BaseProps & { multiline?: boolean } & Record<string, unknown>
    const describedBy = hint ? hintId : undefined
    const invalid = state === 'error' ? true : undefined
    return (
      <div className="field">
        <label htmlFor={inputId}>{label}</label>
        {multiline ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            id={inputId}
            className={inputClass(state)}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            id={inputId}
            className={inputClass(state)}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...(rest as InputHTMLAttributes<HTMLInputElement>)}
          />
        )}
        {hint && (
          <span id={hintId} className={state === 'error' ? 'field-hint err' : 'field-hint'}>
            {hint}
          </span>
        )}
      </div>
    )
  }
)

export default Field
