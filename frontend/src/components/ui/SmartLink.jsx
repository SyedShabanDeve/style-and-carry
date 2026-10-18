import { Link } from 'react-router-dom';

/** A router link for paths on this site, a normal new-tab link for the rest. */
export default function SmartLink({ to, children, ...rest }) {
  if (!to) return <div {...rest}>{children}</div>;
  if (/^https?:\/\//.test(to)) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} {...rest}>
      {children}
    </Link>
  );
}
