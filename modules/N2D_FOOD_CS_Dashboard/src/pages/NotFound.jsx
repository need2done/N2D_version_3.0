import { useNavigate } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
      <EmptyState
        icon="❓"
        title="Page Not Found"
        subtitle="The page you are trying to visit does not exist or may have been moved."
        action={{
          label: 'Back to Home',
          onClick: () => navigate('/'),
        }}
      />
    </div>
  );
}
