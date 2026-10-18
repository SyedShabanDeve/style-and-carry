import Button from '../components/ui/Button';
import { ArrowRight } from '../components/ui/Icons';

export default function NotFound() {
  return (
    <div className="wrap nf">
      <strong>404</strong>
      <h1>This page does not exist</h1>
      <p>The link may be old, or the page may have moved.</p>
      <div className="nf-act">
        <Button to="/">Go home</Button>
        <Button to="/shop" variant="outline">
          Browse the shop <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
