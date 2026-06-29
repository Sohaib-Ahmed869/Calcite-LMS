import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { Modal, Button } from '../../../components/ui';
import { PasswordField, PasswordStrength } from '../../../admin-ui/fields';
import { StudentService } from '../../../services/student.service';

/** Admin reset of a student's password. */
export function ResetPasswordModal({ open, onClose, student, onDone }) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setPassword(''); }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    setSaving(true);
    try {
      await StudentService.resetPassword(student._id, password);
      toast.success('Password reset');
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      icon={KeyRound}
      title="Reset password"
      subtitle={student ? `${student.displayName} · ${student.email}` : undefined}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Reset password</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-2 px-5 py-5">
        <PasswordField label="New password" name="newPassword" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} placeholder="At least 6 characters" autoFocus />
        <PasswordStrength value={password} />
        <p className="pt-1 text-xs text-muted-foreground">Share the new password with the student securely. They can change it from their profile.</p>
      </form>
    </Modal>
  );
}

export default ResetPasswordModal;
