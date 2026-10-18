/**
 * Small label. tone: neutral | dark | accent | sale | ok | warn | bad
 */
export default function Badge({ tone = 'neutral', className = '', children, ...rest }) {
  return (
    <span className={`tag tag-${tone} ${className}`.trim()} {...rest}>
      {children}
    </span>
  );
}
