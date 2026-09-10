import type { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'sm'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: Variant
  size?: Size
}

/**
 * The only button in the interface. One shape, one set of states, so a button
 * never means something different in the wizard than it does in the results.
 * `type` is fixed to "button": nothing here submits a form, and a stray submit
 * would reload the page and throw away the design the user is building.
 */
export function Button({ variant = 'secondary', size = 'md', className, ...rest }: ButtonProps) {
  const classes = [styles.button, styles[variant], size === 'md' ? '' : styles[size], className]
    .filter(Boolean)
    .join(' ')

  return <button type="button" className={classes} {...rest} />
}
