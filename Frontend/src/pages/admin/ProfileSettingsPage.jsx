import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  MapPin,
  Lock,
  Mail,
  ShieldCheck,
  CalendarDays,
  Globe,
  Building2,
  Hash,
  Home,
  Map as MapIcon,
  Camera,
  Loader2,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../auth/AuthProvider';
import { humanize, initials } from '../../lib/format';
import { cn } from '../../lib/cn';
import { TabRail } from '../../admin-ui/TabRail';
import { CustomSelect } from '../../admin-ui/CustomSelect';
import { AdminLoader } from '../../admin-ui/Loader';
import { Field, TextInput, PhoneInput, SectionHead, SaveButton, PasswordField, PasswordStrength, Banner } from '../../admin-ui/fields';
import ProfileService from '../../services/profile.service';

const TABS = [
  { id: 'personal', label: 'Personal', desc: 'Name & contact', icon: User },
  { id: 'address', label: 'Address', desc: "Where you're based", icon: MapPin },
  { id: 'security', label: 'Security', desc: 'Password', icon: Lock },
];

const COUNTRIES = [
  'Australia', 'New Zealand', 'United Kingdom', 'United States', 'Canada', 'Ireland', 'India', 'Pakistan',
  'Bangladesh', 'Sri Lanka', 'Singapore', 'Malaysia', 'Indonesia', 'Philippines', 'China', 'Japan',
  'South Korea', 'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Turkey',
  'Egypt', 'South Africa', 'Kenya', 'Nigeria', 'Ghana', 'Germany', 'France', 'Italy', 'Spain', 'Portugal',
  'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland',
  'Greece', 'Brazil', 'Argentina', 'Mexico', 'Chile', 'Colombia', 'Fiji', 'Other',
].map((c) => ({ value: c, label: c }));

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function toForm(u = {}) {
  return {
    firstName: u.firstName || '',
    lastName: u.lastName || '',
    displayName: u.displayName || '',
    email: u.email || '',
    phone: u.phone || '',
    country: u.country || '',
    profileImage: u.profileImage || '',
    role: u.role || '',
    createdAt: u.createdAt || null,
    passwordSetAt: u.passwordSetAt || null,
    address: {
      street: u.address?.street || '',
      city: u.address?.city || '',
      state: u.address?.state || '',
      postalCode: u.address?.postalCode || '',
    },
  };
}

export function ProfileSettingsPage() {
  const { user, reload } = useAuth();
  const fileRef = useRef(null);
  const [tab, setTab] = useState('personal');
  const [form, setForm] = useState(() => (user ? toForm(user) : null));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  // Fall back to initials if the (signed) avatar URL fails to load; reset on every new src.
  const [avatarError, setAvatarError] = useState(false);
  useEffect(() => setAvatarError(false), [form?.profileImage]);

  if (!form) {
    return (
      <div className="min-h-[60vh]">
        <AdminLoader label="Loading profile" />
      </div>
    );
  }

  const onField = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const onAddress = (e) => setForm((f) => ({ ...f, address: { ...f.address, [e.target.name]: e.target.value } }));
  const onPwd = (e) => setPwd((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file');
    if (file.size > 2 * 1024 * 1024) return toast.error('Image must be under 2MB');
    setUploading(true);
    try {
      const res = await ProfileService.uploadAvatar(file);
      setForm((f) => ({ ...f, profileImage: res.url || res.user?.profileImage || f.profileImage }));
      await reload();
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await ProfileService.updateMe({
        firstName: form.firstName,
        lastName: form.lastName,
        displayName: form.displayName,
        phone: form.phone,
        country: form.country,
        address: { ...form.address },
      });
      if (res.user) setForm((f) => ({ ...toForm(res.user), profileImage: res.user.profileImage || f.profileImage }));
      await reload();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pwd.newPassword !== pwd.confirmPassword) return toast.error("New passwords don't match");
    setSaving(true);
    try {
      const res = await ProfileService.changePassword({ currentPassword: pwd.currentPassword || undefined, newPassword: pwd.newPassword });
      toast.success(res?.message || 'Password updated');
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' });
      await reload();
    } catch (err) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const fullName = `${form.firstName} ${form.lastName}`.trim() || form.displayName || (form.email ? form.email.split('@')[0] : 'User');
  const avatar = form.profileImage;
  const roleLabel = humanize(form.role) || 'Member';
  const memberSince = formatDate(form.createdAt);
  const pwdChanged = formatDate(form.passwordSetAt);
  const hasPassword = !!form.passwordSetAt;

  const np = pwd.newPassword;
  const passwordReqs = [
    { label: 'At least 6 characters', ok: np.length >= 6 },
    { label: 'One uppercase letter', ok: /[A-Z]/.test(np) },
    { label: 'One lowercase letter', ok: /[a-z]/.test(np) },
    { label: 'One number', ok: /\d/.test(np) },
    { label: 'Passwords match', ok: np.length > 0 && np === pwd.confirmPassword },
  ];

  return (
    <>
      <div className="w-full space-y-6 text-foreground">
        {/* Identity banner */}
        <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
          <Banner />
          <div className="flex flex-col gap-4 px-6 pb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="relative -mt-12 shrink-0">
                {avatar && !avatarError ? (
                  <img src={avatar} alt={fullName} onError={() => setAvatarError(true)} className="h-24 w-24 rounded-card object-cover ring-4 ring-card" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-card text-2xl font-bold text-white ring-4 ring-card" style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-primary))' }}>
                    {initials(fullName)}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-pill bg-accent text-accent-foreground shadow-card ring-2 ring-card transition hover:opacity-90 disabled:opacity-60"
                  aria-label="Change profile photo"
                  title="Change profile photo"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                </button>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onAvatarPick} />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold text-foreground sm:text-2xl">{fullName}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{form.email}</span>
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent" style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.1)' }}>
                    <ShieldCheck className="h-3.5 w-3.5" /> {roleLabel}
                  </span>
                </div>
              </div>
            </div>
            {(memberSince || pwdChanged) && (
              <div className="shrink-0 space-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground sm:border-0 sm:pt-0 sm:text-right">
                {memberSince ? (
                  <p className="flex items-center gap-2 sm:justify-end">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" /> Member since {memberSince}
                  </p>
                ) : null}
                {pwdChanged ? (
                  <p className="flex items-center gap-2 sm:justify-end">
                    <Lock className="h-3.5 w-3.5 shrink-0" /> Password updated {pwdChanged}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Tab rail + form */}
        <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <TabRail tabs={TABS} value={tab} onChange={setTab} layoutId="profileTabActive" />

          <div className="rounded-card border border-border bg-card p-6 shadow-card lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
                {tab === 'personal' && (
                  <form onSubmit={saveProfile} className="space-y-6">
                    <SectionHead icon={User} title="Personal details" desc="Update your name and contact information." />
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <Field label="First name">
                        <TextInput icon={User} name="firstName" value={form.firstName} onChange={onField} placeholder="Jane" />
                      </Field>
                      <Field label="Last name">
                        <TextInput icon={User} name="lastName" value={form.lastName} onChange={onField} placeholder="Doe" />
                      </Field>
                      <Field label="Display name" className="sm:col-span-2 sm:max-w-sm" hint="Shown across the portal.">
                        <TextInput icon={User} name="displayName" value={form.displayName} onChange={onField} placeholder="Jane Doe" />
                      </Field>
                      <Field label="Email address" hint="Your email address can't be changed.">
                        <TextInput icon={Mail} name="email" value={form.email} disabled readOnly />
                      </Field>
                      <Field label="Phone number">
                        <PhoneInput value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="400 000 000" />
                      </Field>
                      <Field label="Country" className="sm:col-span-2 sm:max-w-sm">
                        <CustomSelect icon={Globe} value={form.country} onChange={(v) => setForm((f) => ({ ...f, country: v }))} placeholder="Select country" searchPlaceholder="Search countries…" options={COUNTRIES} />
                      </Field>
                    </div>
                    <div className="flex justify-end border-t border-border pt-6">
                      <SaveButton saving={saving}>Save changes</SaveButton>
                    </div>
                  </form>
                )}

                {tab === 'address' && (
                  <form onSubmit={saveProfile} className="space-y-6">
                    <SectionHead icon={MapPin} title="Address" desc="Where you're based." />
                    <div className="space-y-5">
                      <Field label="Street address">
                        <TextInput icon={Home} name="street" value={form.address.street} onChange={onAddress} placeholder="123 Main Street" />
                      </Field>
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Field label="City">
                          <TextInput icon={Building2} name="city" value={form.address.city} onChange={onAddress} placeholder="City" />
                        </Field>
                        <Field label="State / Province">
                          <TextInput icon={MapIcon} name="state" value={form.address.state} onChange={onAddress} placeholder="State" />
                        </Field>
                      </div>
                      <Field label="Postal code" className="sm:max-w-xs">
                        <TextInput icon={Hash} name="postalCode" value={form.address.postalCode} onChange={onAddress} placeholder="0000" />
                      </Field>
                    </div>
                    <div className="flex justify-end border-t border-border pt-6">
                      <SaveButton saving={saving}>Save address</SaveButton>
                    </div>
                  </form>
                )}

                {tab === 'security' && (
                  <form onSubmit={savePassword} className="space-y-6">
                    <SectionHead icon={Lock} title={hasPassword ? 'Change password' : 'Set a password'} desc={pwdChanged ? `Last changed ${pwdChanged}.` : 'Set a password for your account.'} />
                    <div className="grid gap-8 lg:grid-cols-2">
                      <div className="space-y-5">
                        {hasPassword ? (
                          <PasswordField label="Current password" name="currentPassword" value={pwd.currentPassword} onChange={onPwd} required />
                        ) : null}
                        <div>
                          <PasswordField label="New password" name="newPassword" value={pwd.newPassword} onChange={onPwd} minLength={6} required />
                          <PasswordStrength value={pwd.newPassword} />
                        </div>
                        <PasswordField label="Confirm new password" name="confirmPassword" value={pwd.confirmPassword} onChange={onPwd} minLength={6} required />
                      </div>
                      <div className="self-start rounded-card border border-border bg-muted p-5">
                        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <ShieldCheck className="h-4 w-4 text-accent" /> Password requirements
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">A strong password keeps your account safe.</p>
                        <ul className="mt-4 space-y-2.5">
                          {passwordReqs.map((r) => (
                            <li key={r.label} className="flex items-center gap-2.5 text-sm">
                              <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-pill transition-colors', r.ok ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground ring-1 ring-border')}>
                                <Check className="h-3 w-3" />
                              </span>
                              <span className={cn('transition-colors', r.ok ? 'text-foreground' : 'text-muted-foreground')}>{r.label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="flex justify-end border-t border-border pt-6">
                      <SaveButton saving={saving}>{hasPassword ? 'Update password' : 'Set password'}</SaveButton>
                    </div>
                  </form>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}

export default ProfileSettingsPage;
