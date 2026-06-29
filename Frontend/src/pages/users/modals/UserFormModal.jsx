import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { UserPlus, Check } from 'lucide-react';
import { Modal, Button } from '../../../components/ui';
import { Field, TextInput, PasswordField } from '../../../admin-ui/fields';
import { cn } from '../../../lib/cn';
import { UserService } from '../../../services/user.service';
import { ASSIGNABLE_ROLES } from '../usersUtils';

const blank = { firstName: '', lastName: '', email: '', password: '', phone: '', country: '', roles: ['student'] };

/** Create or edit a user. `user` null → create (email + password required). Multi-role selection. */
export function UserFormModal({ open, onClose, user, onSaved }) {
  const editing = !!user?._id;
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      user
        ? {
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            password: '',
            phone: user.phone || '',
            country: user.country || '',
            roles: user.roles?.length ? [...user.roles] : ['student'],
          }
        : blank,
    );
  }, [open, user]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggleRole = (value) =>
    setForm((f) => ({ ...f, roles: f.roles.includes(value) ? f.roles.filter((r) => r !== value) : [...f.roles, value] }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) return toast.error('First and last name are required');
    if (!form.roles.length) return toast.error('Select at least one role');
    if (!editing) {
      if (!form.email.trim()) return toast.error('Email is required');
      if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    }
    setSaving(true);
    try {
      const base = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        country: form.country.trim(),
        roles: form.roles,
      };
      if (editing) {
        await UserService.update(user._id, base);
      } else {
        await UserService.create({ ...base, email: form.email.trim(), password: form.password });
      }
      toast.success(editing ? 'User updated' : 'User created');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

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
          <Button onClick={submit} loading={saving}>{editing ? 'Save changes' : 'Create user'}</Button>
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
        </Field>

        {!editing ? (
          <PasswordField label="Temporary password" name="password" value={form.password} onChange={set('password')} minLength={6} placeholder="At least 6 characters" />
        ) : null}

        <Field label="Roles" hint="A user can hold more than one role. Admin roles unlock the management areas.">
          <div className="grid gap-2 sm:grid-cols-2">
            {ASSIGNABLE_ROLES.map((r) => {
              const selected = form.roles.includes(r.value);
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => toggleRole(r.value)}
                  className={cn(
                    'flex items-start gap-2.5 rounded-input border p-3 text-left transition-colors',
                    selected ? 'bg-muted/40' : 'border-border hover:border-accent/40',
                  )}
                  style={selected ? { borderColor: r.color } : undefined}
                >
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: `${r.color}1f`, color: r.color }}>
                    <r.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground">{r.label}</span>
                      {selected ? <Check className="h-3.5 w-3.5" style={{ color: r.color }} /> : null}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{r.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" hint="Optional."><TextInput value={form.phone} onChange={set('phone')} placeholder="+61 400 000 000" /></Field>
          <Field label="Country" hint="Optional."><TextInput value={form.country} onChange={set('country')} placeholder="Australia" /></Field>
        </div>
      </form>
    </Modal>
  );
}

export default UserFormModal;
