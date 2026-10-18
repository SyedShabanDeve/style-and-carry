import { Search } from './Icons';

/**
 * Every "nothing here" and "something went wrong" screen in the shop.
 * tone="error" colours the icon for failures. heading="h1" when it is the
 * only content on the page.
 */
export default function EmptyState({
  icon: Icon = Search,
  title,
  children,
  action,
  tone = 'neutral',
  compact = false,
  className = '',
  heading: Heading = 'h3',
}) {
  return (
    <div
      className={`empty-state tone-${tone}${compact ? ' compact' : ''} ${className}`.trim()}
      role={tone === 'error' ? 'alert' : undefined}
    >
      <span className="empty-ico">
        <Icon size={compact ? 22 : 26} />
      </span>
      {title && <Heading className="empty-title">{title}</Heading>}
      {children && <p>{children}</p>}
      {action && <div className="empty-act">{action}</div>}
    </div>
  );
}
