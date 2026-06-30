import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ArrowRight, Mail, Lock, GraduationCap, Eye, EyeOff, BookOpen, Users, BarChart3, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../auth/AuthProvider';
import { useBranding } from '../../theme/BrandingProvider';

const FEATURES = [
  { icon: BookOpen, label: 'Courses, lessons & content' },
  { icon: Users, label: 'Students, enrolments & progress' },
  { icon: BarChart3, label: 'Live analytics & reports' },
];

const DEMOS = [
  { role: 'Admin', icon: ShieldCheck, email: 'admin@calcite.test', password: 'admin123' },
  { role: 'Student', icon: GraduationCap, email: 'student1@calcite.test', password: 'student123' },
];

export function LoginPage() {
  const { login } = useAuth();
  const { branding, tenant } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('admin@calcite.test');
  const [password, setPassword] = useState('admin123');
  const [showPw, setShowPw] = useState(false);
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

  const fillDemo = (d) => {
    setEmail(d.email);
    setPassword(d.password);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ── Brand panel ─────────────────────────────────────────────── */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex xl:p-16"
        style={{
          background: [
            'linear-gradient(to right, rgba(var(--color-accent-rgb), 0.22), transparent 70%)',
            'linear-gradient(160deg, var(--color-sidebar) 0%, color-mix(in srgb, var(--color-sidebar) 82%, #000) 100%)',
          ].join(', '),
        }}
      >
        {/* depth: glow orbs, dot grid & a faint motif */}
        <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full blur-3xl" style={{ background: 'rgba(var(--color-accent-rgb), 0.35)' }} />
        <div className="pointer-events-none absolute -bottom-28 right-0 h-80 w-80 rounded-full blur-3xl" style={{ background: 'rgba(var(--color-accent-rgb), 0.16)' }} />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
        <GraduationCap className="pointer-events-none absolute -right-10 top-8 h-72 w-72 rotate-12 text-white/[0.04]" />

        {/* logo */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="relative flex items-center gap-3">
          {logo ? (
            <img src={logo} alt={brandName} className="h-12 w-auto max-w-[220px] object-contain" />
          ) : (
            <>
              <span className="grid h-11 w-11 place-items-center rounded-xl text-lg font-extrabold ring-1 ring-white/20" style={{ background: 'linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 80%, #fff))' }}>
                {brandName.charAt(0)}
              </span>
              <span className="text-xl font-bold tracking-tight">{brandName}</span>
            </>
          )}
        </motion.div>

        {/* headline + features */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="relative max-w-md">
          <span className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/15 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-white" /> Learning Management System
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.1] xl:text-5xl">
            Your learning,
            <br />
            <span className="bg-gradient-to-r from-white to-[color-mix(in_srgb,var(--color-accent)_55%,#fff)] bg-clip-text text-transparent">beautifully managed.</span>
          </h1>
          <p className="mt-4 text-base text-white/70">{branding?.tagline || 'Students, courses, enrolments and reports — in one branded portal.'}</p>

          <ul className="mt-9 space-y-3">
            {FEATURES.map((f, i) => (
              <motion.li
                key={f.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.25 + i * 0.08 }}
                className="flex items-center gap-3 text-sm text-white/85"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.07] ring-1 ring-white/15">
                  <f.icon className="h-4 w-4 text-white" />
                </span>
                {f.label}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <p className="relative text-sm text-white/40">© {new Date().getFullYear()} {brandName}. All rights reserved.</p>
      </div>

      {/* ── Form panel ──────────────────────────────────────────────── */}
      <div className="relative flex items-center justify-center overflow-hidden bg-background px-6 py-12">
        {/* soft brand glow behind the form */}
        <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full blur-3xl" style={{ background: 'rgba(var(--color-accent-rgb), 0.08)' }} />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative w-full max-w-sm"
        >
          {/* mobile brand */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            {logo ? (
              <img src={logo} alt={brandName} className="h-11 w-auto max-w-[180px] object-contain" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }} />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-xl text-xl font-extrabold text-white" style={{ background: 'var(--color-sidebar)' }}>
                {brandName.charAt(0)}
              </span>
            )}
          </div>

          <div className="mb-2 inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-medium text-accent" style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.12)' }}>
            <GraduationCap className="h-3.5 w-3.5" /> {tenant?.name || brandName}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your account to continue.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">Email</span>
              <span className="group relative block">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-input border border-border bg-card py-3 pl-10 pr-3 text-sm text-foreground shadow-sm outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
                  placeholder="you@school.edu"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">Password</span>
              <span className="group relative block">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent" />
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-input border border-border bg-card py-3 pl-10 pr-10 text-sm text-foreground shadow-sm outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  tabIndex={-1}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="group flex w-full items-center justify-center gap-2 rounded-btn py-3 text-sm font-semibold text-accent-foreground shadow-sm transition-all hover:shadow-md hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: 'linear-gradient(120deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 72%, var(--color-primary)))' }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {busy ? 'Signing in…' : 'Sign in'}
              {busy ? null : <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
            </button>
          </form>

          {/* Clickable demo accounts — tap to fill the form */}
          <div className="mt-7">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Demo accounts — tap to fill</p>
            <div className="grid grid-cols-2 gap-2.5">
              {DEMOS.map((d) => (
                <button
                  key={d.role}
                  type="button"
                  onClick={() => fillDemo(d)}
                  className="group rounded-card border border-border bg-card p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md"
                >
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-accent" style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.12)' }}>
                      <d.icon className="h-3.5 w-3.5" />
                    </span>
                    {d.role}
                  </span>
                  <span className="mt-1.5 block truncate text-[11px] text-muted-foreground">{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default LoginPage;
