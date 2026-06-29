import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { titleForPath } from '../app/nav';
import { Card } from '../components/ui';

/**
 * Generic stub for routed nav items that aren't built out yet. Keeps every sidebar link landing on a
 * real, themed page instead of a blank screen. Pass `title`/`description` to customise.
 */
export function PlaceholderPage({ title, description }) {
  const { pathname } = useLocation();
  const heading = title || titleForPath(pathname);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{heading}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description || 'This section is part of the LMS shell.'}</p>
      </div>

      <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-card" style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.12)' }}>
          <Construction className="h-7 w-7 text-accent" />
        </span>
        <h2 className="text-lg font-semibold text-foreground">{heading} — coming soon</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          The screen renders inside the fully themed shell, so it already follows the tenant's palette, fonts and shape from the Branding page.
        </p>
      </Card>
    </div>
  );
}

export default PlaceholderPage;
