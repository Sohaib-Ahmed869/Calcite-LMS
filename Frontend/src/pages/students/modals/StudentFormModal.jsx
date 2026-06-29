import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { UserPlus } from 'lucide-react';
import { Modal, Button } from '../../../components/ui';
import { Field, TextInput, PasswordField } from '../../../admin-ui/fields';
import { StudentService } from '../../../services/student.service';

const blank = { firstName: '', lastName: '', email: '', password: '', phone: '', country: '' };

/** Create or edit a student. `student` null → create (email + password required). */
export function StudentFormModal({ open, onClose, student, onSaved }) {
  const editing = !!student?._id;
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(student ? {
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      email: student.email || '',
      password: '',
      phone: student.phone || '',
      country: student.country || '',
    } : blank);
  }, [open, student]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) return toast.error('First and last name are required');
    if (!editing) {
      if (!form.email.trim()) return toast.error('Email is required');
      if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    }
    setSaving(true);
    try {
      if (editing) {
        await StudentService.update(student._id, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          country: form.country.trim(),
        });
      } else {
        await StudentService.create({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim(),
          country: form.country.trim(),
        });
      }
      toast.success(editing ? 'Student updated' : 'Student created');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save student');
    } finally {
      setSaving(false);
    }
  };

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
          <Button onClick={submit} loading={saving}>{editing ? 'Save changes' : 'Create student'}</Button>
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" hint="Optional."><TextInput value={form.phone} onChange={set('phone')} placeholder="+61 400 000 000" /></Field>
          <Field label="Country" hint="Optional."><TextInput value={form.country} onChange={set('country')} placeholder="Australia" /></Field>
        </div>
      </form>
    </Modal>
  );
}

export default StudentFormModal;
