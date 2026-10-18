import { forwardRef } from 'react';
import { Link } from 'react-router-dom';

/**
 * The one button in the app.
 *
 *   <Button>Save</Button>
 *   <Button variant="outline" size="lg" to="/shop">Shop</Button>
 *   <Button href="https://…" external>Open</Button>
 *   <Button loading>Placing order…</Button>
 *
 * variant: primary | secondary | outline | ghost | destructive | accent | wa
 * size:    sm | md | lg
 *
 * The same look is also available as plain classes (`btn btn-primary`) for
 * places that render their own element.
 */
const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    block = false,
    loading = false,
    to,
    href,
    external = false,
    className = '',
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref
) {
  const cls = [
    'btn',
    `btn-${variant}`,
    size !== 'md' && `btn-${size}`,
    block && 'btn-block',
    loading && 'is-loading',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {loading && <span className="spin" aria-hidden="true" />}
      {children}
    </>
  );

  if (to) {
    return (
      <Link ref={ref} to={to} className={cls} {...rest}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        ref={ref}
        href={href}
        className={cls}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...rest}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {content}
    </button>
  );
});

export default Button;
