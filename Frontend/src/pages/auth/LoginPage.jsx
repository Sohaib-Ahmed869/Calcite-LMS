import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, LogIn, Mail, Lock, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../auth/AuthProvider';
import { useBranding } from '../../theme/BrandingProvider';

export function LoginPage() {
  const { login } = useAuth();
  const { branding, tenant } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('admin@calcite.test');
  const [password, setPassword] = useState('admin123');
  const [busy, setBusy] = useState(false);

  const brandName = branding?.displayName || tenant?.name || 'Calcite LMS';
  const logo = branding?.logos?.full || branding?.logos?.mark;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      toast.success(`Welcome back, ${user.displayName?.split(' ')[0] || ''}`.trim());
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Login failed');
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex"
        style={{
          background: [
            'linear-gradient(to right, rgba(var(--color-accent-rgb), 0.22), transparent 70%)',
            'linear-gradient(160deg, var(--color-sidebar) 0%, color-mix(in srgb, var(--color-sidebar) 82%, #000) 100%)',
          ].join(', '),
        }}
      >
        <div className="flex items-center gap-3">
          {logo ? (
            <img src={logo} alt={brandName} className="h-12 w-auto max-w-[220px] object-contain" />
          ) : (
            <span className="grid h-11 w-11 place-items-center rounded-xl text-lg font-extrabold ring-1 ring-white/20" style={{ background: 'linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 80%, #fff))' }}>
              {brandName.charAt(0)}
            </span>
          )}
          <span className="text-xl font-bold tracking-tight">{brandName}</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-bold leading-tight">Your learning, beautifully managed.</h1>
          <p className="mt-4 text-white/70">{branding?.tagline || 'Students, courses, enrollments and reports — in one branded portal.'}</p>
        </div>

        <p className="text-sm text-white/40">© {new Date().getFullYear()} {brandName}. All rights reserved.</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="grid h-12 w-12 place-items-center rounded-xl text-xl font-extrabold text-white" style={{ background: 'var(--color-sidebar)' }}>
              {brandName.charAt(0)}
            </span>
          </div>

          <div className="mb-2 inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-medium text-accent" style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.12)' }}>
            <GraduationCap className="h-3.5 w-3.5" /> {tenant?.name || brandName}
          </div>
          <h2 className="text-2xl font-bold text-foreground">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">Welcome back — enter your details to continue.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">Email</span>
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-input border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
                  placeholder="you@school.edu"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">Password</span>
              <span className="relative block">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-input border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
                  placeholder="••••••••"
                />
              </span>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-btn bg-accent py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 rounded-card border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Demo credentials</p>
            <p className="mt-1">admin@calcite.test · admin123 (admin)</p>
            <p>student1@calcite.test · student123 (student)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
