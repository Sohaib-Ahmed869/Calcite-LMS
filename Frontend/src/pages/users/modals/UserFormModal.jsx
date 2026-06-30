import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { UserPlus, Check, Lock, Eye, EyeOff, RefreshCw, Copy } from 'lucide-react';
import { Modal, Button } from '../../../components/ui';
import { Field, TextInput, PhoneInput } from '../../../admin-ui/fields';
import { CustomSelect } from '../../../admin-ui/CustomSelect';
import { COUNTRIES } from '../../../admin-ui/countries';
import { cn } from '../../../lib/cn';
import { EMAIL_RE, generatePassword, normalizePhone, EMAIL_FEEDBACK } from '../../../lib/accountForm';
import { UserService } from '../../../services/user.service';
import { ASSIGNABLE_ROLES } from '../usersUtils';

const blank = { firstName: '', lastName: '', email: '', password: '', phone: '', country: '', roles: ['student'] };

/** Create or edit a user. `user` null → create (email + auto-generated temp password). Multi-role. */
export function UserFormModal({ open, onClose, user, onSaved }) {
  const editing = !!user?._id;
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailStatus, setEmailStatus] = useState('idle'); // idle | invalid | checking | available | taken

  useEffect(() => {
    if (!open) return;
    setForm(user ? {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      password: '',
      phone: user.phone || '',
      country: user.country || '',
      roles: user.roles?.length ? [...user.roles] : ['student'],
    } : { ...blank, password: generatePassword() });
    setEmailStatus('idle');
    setShowPw(false);
    setCopied(false);
  }, [open, user]);

  // Debounced duplicate-email check (create only). `alive` guards against keystroke races.
  useEffect(() => {
    if (!open || editing) return;
    const email = form.email.trim().toLowerCase();
    if (!email) { setEmailStatus('idle'); return; }
    if (!EMAIL_RE.test(email)) { setEmailStatus('invalid'); return; }
    setEmailStatus('checking');
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const res = await UserService.checkEmail(email);
        if (alive) setEmailStatus(res?.available ? 'available' : 'taken');
      } catch {
        if (alive) setEmailStatus('idle'); // network hiccup — server-side validation still applies
      }
    }, 400);
    return () => { alive = false; clearTimeout(t); };
  }, [form.email, open, editing]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setVal = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleRole = (value) =>
    setForm((f) => ({ ...f, roles: f.roles.includes(value) ? f.roles.filter((r) => r !== value) : [...f.roles, value] }));

  const regeneratePassword = () => { setForm((f) => ({ ...f, password: generatePassword() })); setShowPw(true); };
  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(form.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Couldn’t copy to clipboard');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) return toast.error('First and last name are required');
    if (!form.roles.length) return toast.error('Select at least one role');
    if (!editing) {
      if (!form.email.trim()) return toast.error('Email is required');
      if (!EMAIL_RE.test(form.email.trim())) return toast.error('Enter a valid email address');
      if (emailStatus === 'taken') return toast.error('That email is already registered');
      if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    }
    setSaving(true);
    try {
      const base = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: normalizePhone(form.phone),
        country: form.country.trim(),
        roles: form.roles,
      };
      const saved = editing
        ? await UserService.update(user._id, base)
        : await UserService.create({ ...base, email: form.email.trim(), password: form.password });
      toast.success(editing ? 'User updated' : 'User created');
      onSaved?.(saved);
      onClose();
    } catch (err) {
      if (!editing && /already exists|already registered/i.test(err.message || '')) setEmailStatus('taken');
      toast.error(err.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const feedback = !editing ? EMAIL_FEEDBACK[emailStatus] : null;

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      icon={UserPlus}
      title={editing ? 'Edit user' : 'New user'}
      subtitle={editing ? user.email : 'Create an account and assign roles'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving} disabled={!editing && emailStatus === 'taken'}>
            {editing ? 'Save changes' : 'Create user'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5 px-5 py-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name"><TextInput value={form.firstName} onChange={set('firstName')} placeholder="Jane" autoFocus /></Field>
          <Field label="Last name"><TextInput value={form.lastName} onChange={set('lastName')} placeholder="Doe" /></Field>
        </div>

        <Field label="Email" hint={editing ? "Email can't be changed after creation." : 'Used to sign in.'}>
          <TextInput type="email" value={form.email} onChange={set('email')} placeholder="jane@example.com" disabled={editing} readOnly={editing} />
          {feedback ? (
            <p className={cn('mt-1.5 flex items-center gap-1.5 text-xs', feedback.cls)}>
              <feedback.icon className={cn('h-3.5 w-3.5 shrink-0', feedback.spin && 'animate-spin')} />
              {feedback.text}
            </p>
          ) : null}
        </Field>

        {!editing ? (
          <Field label="Temporary password" hint="Auto-generated — share it with the user. They should change it after first sign-in.">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  minLength={6}
                  placeholder="At least 6 characters"
                  className="w-full rounded-input border border-border bg-card px-3 py-2.5 pl-9 pr-10 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/20"
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
              </div>
              <Button type="button" variant="secondary" size="icon" icon={RefreshCw} onClick={regeneratePassword} title="Generate a new password" aria-label="Generate a new password" />
              <Button type="button" variant="secondary" size="icon" icon={copied ? Check : Copy} onClick={copyPassword} title="Copy password" aria-label="Copy password" />
            </div>
          </Field>
        ) : null}

        <Field label="Roles" hint="A user can hold more than one role. Admin roles unlock the management areas.">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {ASSIGNABLE_ROLES.map((r) => {
              const selected = form.roles.includes(r.value);
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => toggleRole(r.value)}
                  aria-pressed={selected}
                  className={cn(
                    'group relative flex items-start gap-3 rounded-input border p-3 text-left transition-all duration-200 active:scale-[0.98]',
                    selected ? 'border-transparent' : 'border-border hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-soft',
                  )}
                  style={selected ? { backgroundColor: `${r.color}14`, boxShadow: `inset 0 0 0 2px ${r.color}` } : undefined}
                >
                  {/* animated check badge */}
                  <span
                    className={cn('absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full text-white transition-all duration-200', selected ? 'scale-100 opacity-100' : 'scale-50 opacity-0')}
                    style={{ backgroundColor: r.color }}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span
                    className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors duration-200"
                    style={selected ? { backgroundColor: r.color, color: '#fff' } : { backgroundColor: `${r.color}1f`, color: r.color }}
                  >
                    <r.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 pr-5">
                    <span className="block text-sm font-semibold text-foreground">{r.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{r.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" hint="Optional.">
            <PhoneInput value={form.phone} onChange={setVal('phone')} placeholder="400 000 000" />
          </Field>
          <Field label="Country" hint="Optional.">
            <CustomSelect value={form.country} onChange={setVal('country')} placeholder="Select country" searchPlaceholder="Search countries…" options={COUNTRIES} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

export default UserFormModal;
