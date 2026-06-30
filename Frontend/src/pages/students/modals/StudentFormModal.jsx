import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { UserPlus, Lock, Eye, EyeOff, RefreshCw, Copy, Check } from 'lucide-react';
import { Modal, Button } from '../../../components/ui';
import { Field, TextInput, PhoneInput } from '../../../admin-ui/fields';
import { CustomSelect } from '../../../admin-ui/CustomSelect';
import { COUNTRIES } from '../../../admin-ui/countries';
import { cn } from '../../../lib/cn';
import { invalidateCache } from '../../../lib/useApi';
import { EMAIL_RE, generatePassword, normalizePhone, EMAIL_FEEDBACK } from '../../../lib/accountForm';
import { StudentService } from '../../../services/student.service';

const blank = { firstName: '', lastName: '', email: '', password: '', phone: '', country: '' };

/** Create or edit a student. `student` null → create (email + auto-generated temp password). */
export function StudentFormModal({ open, onClose, student, onSaved }) {
  const editing = !!student?._id;
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailStatus, setEmailStatus] = useState('idle'); // idle | invalid | checking | available | taken

  useEffect(() => {
    if (!open) return;
    setForm(student ? {
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      email: student.email || '',
      password: '',
      phone: student.phone || '',
      country: student.country || '',
    } : { ...blank, password: generatePassword() });
    setEmailStatus('idle');
    setShowPw(false);
    setCopied(false);
  }, [open, student]);

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
        const res = await StudentService.checkEmail(email);
        if (alive) setEmailStatus(res?.available ? 'available' : 'taken');
      } catch {
        if (alive) setEmailStatus('idle'); // network hiccup — server-side validation still applies
      }
    }, 400);
    return () => { alive = false; clearTimeout(t); };
  }, [form.email, open, editing]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setVal = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

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
    if (!editing) {
      if (!form.email.trim()) return toast.error('Email is required');
      if (!EMAIL_RE.test(form.email.trim())) return toast.error('Enter a valid email address');
      if (emailStatus === 'taken') return toast.error('That email is already registered');
      if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    }
    setSaving(true);
    try {
      const phone = normalizePhone(form.phone);
      const country = form.country.trim();
      const saved = editing
        ? await StudentService.update(student._id, {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            phone,
            country,
          })
        : await StudentService.create({
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim(),
            password: form.password,
            phone,
            country,
          });
      // Bust the cached student lists so the change shows up immediately — both the Students table
      // ('students') and the enrol modal's active-students picker ('students:active').
      invalidateCache('students');
      invalidateCache('students:active');
      toast.success(editing ? 'Student updated' : 'Student created');
      onSaved?.(saved);
      onClose();
    } catch (err) {
      // Reflect a server-side duplicate inline too, in case the debounce missed it.
      if (!editing && /already exists|already registered/i.test(err.message || '')) setEmailStatus('taken');
      toast.error(err.message || 'Failed to save student');
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
      title={editing ? 'Edit student' : 'New student'}
      subtitle={editing ? student.email : 'Create a student account'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving} disabled={!editing && emailStatus === 'taken'}>
            {editing ? 'Save changes' : 'Create student'}
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
          <Field label="Temporary password" hint="Auto-generated — share it with the student. They should change it after first sign-in.">
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

export default StudentFormModal;
