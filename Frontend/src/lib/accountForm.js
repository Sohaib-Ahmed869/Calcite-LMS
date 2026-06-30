import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

// Shared helpers for the create-account forms (students & users): a readable auto-generated temp
// password, optional-phone normalisation, and the debounced email-availability feedback states.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Crypto-backed [0,1) so generated passwords aren't predictable.
function rand() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 2 ** 32;
  }
  return Math.random();
}

// A readable temp password: one of each class, no ambiguous chars (0/O, 1/l/I), then shuffled.
export function generatePassword(length = 12) {
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';
  const all = upper + lower + digits + symbols;
  const pick = (set) => set[Math.floor(rand() * set.length)];
  const out = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (out.length < length) out.push(pick(all));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join('');
}

// Drop a phone that's only a dial code (e.g. "+61") — phone is optional, so that counts as empty.
export function normalizePhone(raw) {
  const p = (raw || '').trim();
  if (!p) return '';
  const national = p.replace(/^\+\d+/, '').replace(/[\s-]/g, '');
  return national ? p : '';
}

// Inline feedback shown under the email field, keyed by the check state.
export const EMAIL_FEEDBACK = {
  invalid: { icon: AlertCircle, cls: 'text-muted-foreground', text: 'Enter a valid email address.' },
  checking: { icon: Loader2, cls: 'text-muted-foreground', text: 'Checking availability…', spin: true },
  available: { icon: CheckCircle2, cls: 'text-success', text: 'This email is available.' },
  taken: { icon: AlertCircle, cls: 'text-danger', text: 'This email is already registered.' },
};
