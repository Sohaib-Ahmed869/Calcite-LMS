import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  Power,
  KeyRound,
  ShieldCheck,
  UserCheck,
  UserX,
  Check,
  Mail,
  CalendarDays,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  LayoutGrid,
  List as ListIcon,
} from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { useAuth } from '../../auth/AuthProvider';
import { cn } from '../../lib/cn';
import { formatDate } from '../../lib/format';
import { Card, Avatar, Button, EmptyState, ConfirmDialog } from '../../components/ui';
import { AdminLoader } from '../../admin-ui/Loader';
import { UserService } from '../../services/user.service';
import { UserFormModal } from './modals/UserFormModal';
import { ResetPasswordModal } from './modals/ResetPasswordModal';
import { ROLES, roleMeta, isAdminUser, primaryRole } from './usersUtils';

const GRADIENT = 'linear-gradient(120deg, var(--color-primary), var(--color-accent))';
const accentTint = (a) => ({ backgroundColor: `rgba(var(--color-accent-rgb), ${a})` });
const VIEW_KEY = 'usersView';

const VIEWS = [
  { id: 'list', label: 'Table', Icon: ListIcon },
  { id: 'grid', label: 'Grid', Icon: LayoutGrid },
];

// Role seniority rank for sorting (index in ROLES; unknown roles sort last).
const ROLE_RANK = Object.fromEntries(ROLES.map((r, i) => [r.value, i]));
const roleRank = (roles) => {
  const p = primaryRole(roles);
  return p in ROLE_RANK ? ROLE_RANK[p] : ROLES.length;
};

// Roles in seniority order, with any unknown/legacy roles appended.
const orderRoles = (roles = []) => {
  const known = ROLES.filter((r) => roles.includes(r.value)).map((r) => r.value);
  return [...known, ...roles.filter((r) => !known.includes(r))];
};

/* ── Small pieces ────────────────────────────────────────────────────────────── */
function HeaderStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-accent" style={accentTint(0.1)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

const SelfBadge = () => (
  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">You</span>
);

function StatusChip({ active, className }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', active ? 'text-success' : 'text-muted-foreground', className)}
      style={{ backgroundColor: active ? 'color-mix(in srgb, var(--color-success) 14%, transparent)' : 'var(--color-muted)' }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active ? 'var(--color-success)' : 'var(--color-mutedForeground)' }} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function RoleBadge({ role }) {
  const m = roleMeta(role);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: `${m.color}1f`, color: m.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: m.color }} />
      {m.label}
    </span>
  );
}

/** Ghost icon button, shared across views. */
function IconAction({ icon: Icon, title, danger, onClick }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      className={cn(
        'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors',
        danger ? 'hover:bg-muted hover:text-danger' : 'hover:bg-muted hover:text-accent',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/** Sortable column header. Click to sort by this column; click again to flip direction. */
function SortHeader({ label, sortKey, sort, onSort, align = 'left' }) {
  const active = sort.key === sortKey;
  const Arrow = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={cn('px-4 py-3.5', align === 'center' && 'text-center', align === 'right' && 'text-right')}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-label={`Sort by ${label}`}
        className={cn('group inline-flex select-none items-center gap-1 transition-colors hover:text-foreground', active && 'text-foreground')}
      >
        {label}
        <Arrow className={cn('h-3 w-3 shrink-0 transition-opacity', active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50')} />
      </button>
    </th>
  );
}

/* ── Table view ──────────────────────────────────────────────────────────────── */
const UserTableRow = memo(function UserTableRow({ user, self, busy, onEdit, onReset, onToggle, onDelete }) {
  return (
    <tr onClick={() => onEdit(user)} className="group cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={user.displayName} src={user.profileImage} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-semibold text-foreground transition-colors group-hover:text-accent">{user.displayName}</span>
              {self ? <SelfBadge /> : null}
            </div>
            <p className="line-clamp-1 text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{orderRoles(user.roles).map((r) => <RoleBadge key={r} role={r} />)}</div></td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{formatDate(user.createdAt)}</td>
      <td className="px-4 py-3"><StatusChip active={user.isActive} /></td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <IconAction icon={Pencil} title="Edit user" onClick={() => onEdit(user)} />
          <IconAction icon={KeyRound} title="Reset password" onClick={() => onReset(user)} />
          <Button
            size="iconSm"
            variant="secondary"
            icon={Power}
            loading={busy}
            onClick={() => onToggle(user)}
            disabled={self}
            title={self ? "You can't change your own status" : user.isActive ? 'Deactivate' : 'Activate'}
            aria-label={user.isActive ? 'Deactivate user' : 'Activate user'}
          />
          <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
          <Button
            size="iconSm"
            variant="dangerGhost"
            icon={Trash2}
            onClick={() => onDelete(user)}
            disabled={self}
            title={self ? "You can't delete your own account" : 'Delete user'}
            aria-label="Delete user"
          />
        </div>
      </td>
    </tr>
  );
});

/** Mobile fallback row. */
const UserMobileRow = memo(function UserMobileRow({ user, self, busy, onEdit, onReset, onToggle, onDelete }) {
  return (
    <div className="p-4">
      <button type="button" onClick={() => onEdit(user)} className="flex w-full items-start gap-3 text-left">
        <Avatar name={user.displayName} src={user.profileImage} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold text-foreground">{user.displayName}</span>
            {self ? <SelfBadge /> : null}
          </div>
          <p className="line-clamp-1 text-xs text-muted-foreground">{user.email}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <StatusChip active={user.isActive} />
            {orderRoles(user.roles).map((r) => <RoleBadge key={r} role={r} />)}
          </div>
        </div>
      </button>
      <div className="mt-3 flex items-center gap-2">
        <IconAction icon={Pencil} title="Edit user" onClick={() => onEdit(user)} />
        <IconAction icon={KeyRound} title="Reset password" onClick={() => onReset(user)} />
        <Button size="sm" variant="secondary" icon={Power} loading={busy} onClick={() => onToggle(user)} disabled={self} className="flex-1">
          {user.isActive ? 'Deactivate' : 'Activate'}
        </Button>
        <Button size="sm" variant="dangerGhost" icon={Trash2} onClick={() => onDelete(user)} disabled={self} title="Delete" aria-label="Delete user" />
      </div>
    </div>
  );
});

/* ── Grid view card ──────────────────────────────────────────────────────────── */
const UserCard = memo(function UserCard({ user, self, busy, onEdit, onReset, onToggle, onDelete }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} className="h-full">
      <Card className="group relative flex h-full flex-col p-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
        {/* hover reset/delete */}
        <span className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="rounded-lg bg-card shadow-sm"><IconAction icon={KeyRound} title="Reset password" onClick={() => onReset(user)} /></span>
          {!self ? <span className="rounded-lg bg-card shadow-sm"><IconAction icon={Trash2} title="Delete user" danger onClick={() => onDelete(user)} /></span> : null}
        </span>

        {/* Identity */}
        <button type="button" onClick={() => onEdit(user)} className="flex items-start gap-3 p-4 text-left">
          <Avatar name={user.displayName} src={user.profileImage} size="lg" />
          <div className="min-w-0 flex-1 pr-12">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-semibold text-foreground transition-colors group-hover:text-accent">{user.displayName}</span>
              {self ? <SelfBadge /> : null}
            </div>
            <p className="mt-0.5 line-clamp-1 flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3 shrink-0" />{user.email}</p>
            <div className="mt-2"><StatusChip active={user.isActive} /></div>
          </div>
        </button>

        {/* Body */}
        <div className="flex flex-1 flex-col px-4 pb-4">
          <div className="flex flex-wrap items-center gap-1">
            {orderRoles(user.roles).map((r) => <RoleBadge key={r} role={r} />)}
          </div>
          <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground"><CalendarDays className="h-3 w-3" /> Joined {formatDate(user.createdAt)}</p>

          <div className="mt-auto flex items-center gap-2 border-t border-border pt-4">
            <Button size="sm" variant="secondary" icon={Power} loading={busy} onClick={() => onToggle(user)} disabled={self} className="flex-1" title={self ? "You can't change your own status" : undefined}>
              {user.isActive ? 'Deactivate' : 'Activate'}
            </Button>
            <Button size="sm" icon={Pencil} onClick={() => onEdit(user)} className="flex-1">Edit</Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
});

/* ── Roles tab ───────────────────────────────────────────────────────────────── */
function RoleCard({ role, count, onView }) {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${role.color}1f`, color: role.color }}>
          <role.icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{role.label}</h3>
            {role.admin ? <span className="rounded-pill px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ backgroundColor: `${role.color}1f`, color: role.color }}>Admin</span> : null}
          </div>
          <p className="text-xs text-muted-foreground">{count} {count === 1 ? 'member' : 'members'}</p>
        </div>
        <button type="button" onClick={onView} className="shrink-0 text-xs font-medium text-accent hover:underline">View</button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{role.description}</p>
      <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
        {role.permissions.map((p) => (
          <li key={p} className="flex items-center gap-2 text-xs text-foreground">
            <Check className="h-3.5 w-3.5 shrink-0" style={{ color: role.color }} /> {p}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function UsersRolesPage() {
  const { user: me } = useAuth();
  const myId = String(me?._id || me?.id || '');
  // cacheKey → render instantly from cache on revisit, then revalidate in the background.
  const { data, loading, error, refetch, mutate } = useApi(() => UserService.list(), [], { cacheKey: 'users' });
  const users = useMemo(() => data || [], [data]);

  const [tab, setTab] = useState('users'); // 'users' | 'roles'
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState(() => {
    try { return localStorage.getItem(VIEW_KEY) || 'list'; } catch { return 'list'; }
  });
  const [sort, setSort] = useState({ key: null, dir: 'asc' }); // null key = natural (server) order

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [toggling, setToggling] = useState(null); // user pending activate/deactivate confirmation

  useEffect(() => {
    try { localStorage.setItem(VIEW_KEY, view); } catch { /* ignore */ }
  }, [view]);

  const isSelf = useCallback((u) => String(u._id) === myId, [myId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter === 'active' && !u.isActive) return false;
      if (statusFilter === 'inactive' && u.isActive) return false;
      if (roleFilter !== 'all' && !(u.roles || []).includes(roleFilter)) return false;
      if (!q) return true;
      return [u.displayName, u.firstName, u.lastName, u.email].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [users, search, roleFilter, statusFilter]);

  // Client-side sort — no extra API call. `key === null` keeps server order.
  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const dir = sort.dir === 'asc' ? 1 : -1;
    const valueOf = (u) => {
      switch (sort.key) {
        case 'name': return (u.displayName || '').toLowerCase();
        case 'role': return roleRank(u.roles || []);
        case 'createdAt': return new Date(u.createdAt).getTime() || 0;
        case 'status': return u.isActive ? 0 : 1;
        default: return 0;
      }
    };
    return [...filtered].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      if (av < bv) return -dir;
      if (av > bv) return dir;
      return 0;
    });
  }, [filtered, sort]);

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter((u) => isAdminUser(u.roles)).length,
    active: users.filter((u) => u.isActive).length,
    inactive: users.filter((u) => !u.isActive).length,
  }), [users]);

  const roleCounts = useMemo(
    () => Object.fromEntries(ROLES.map((r) => [r.value, users.filter((u) => (u.roles || []).includes(r.value)).length])),
    [users],
  );

  const statusPills = [
    { value: 'all', label: 'All', count: stats.total },
    { value: 'active', label: 'Active', count: stats.active },
    { value: 'inactive', label: 'Inactive', count: stats.inactive },
  ];

  // Optimistically flip isActive in the local cache, reconcile with the server's copy, roll back on error.
  const toggleStatus = useCallback(async (u) => {
    if (!u) return;
    const id = u._id;
    const wasActive = u.isActive;
    setBusyId(id);
    mutate((list) => list?.map((x) => (x._id === id ? { ...x, isActive: !wasActive } : x)));
    try {
      const updated = await UserService.setStatus(id, !wasActive);
      mutate((list) => list?.map((x) => (x._id === id ? { ...x, ...updated } : x)));
      toast.success(wasActive ? 'User deactivated' : 'User activated');
      setToggling(null);
    } catch (e) {
      mutate((list) => list?.map((x) => (x._id === id ? { ...x, isActive: wasActive } : x)));
      toast.error(e.message || 'Failed to update');
    } finally {
      setBusyId(null);
    }
  }, [mutate]);

  const confirmDelete = useCallback(async () => {
    if (!deleting) return;
    const id = deleting._id;
    setRemoving(true);
    try {
      await UserService.remove(id);
      mutate((list) => list?.filter((x) => x._id !== id)); // drop locally — no refetch
      toast.success('User deleted');
      setDeleting(null);
    } catch (e) {
      toast.error(e.message || 'Failed to delete');
    } finally {
      setRemoving(false);
    }
  }, [deleting, mutate]);

  // Create/edit return the saved user → patch the cache in place instead of refetching.
  const handleSaved = useCallback((saved) => {
    if (!saved?._id) { refetch(); return; }
    mutate((list) => {
      const arr = list || [];
      return arr.some((u) => u._id === saved._id)
        ? arr.map((u) => (u._id === saved._id ? { ...u, ...saved } : u))
        : [saved, ...arr];
    });
  }, [mutate, refetch]);

  // Stable row handlers so memoized rows re-render only when their own user/busy changes.
  const handleEdit = useCallback((u) => { setEditing(u); setShowForm(true); }, []);
  const handleReset = useCallback((u) => setResetting(u), []);
  const handleDelete = useCallback((u) => setDeleting(u), []);
  const handleToggle = useCallback((u) => setToggling(u), []);
  const onSort = useCallback((key) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }, []);

  if (loading && !data) return <AdminLoader label="Loading users…" />;

  return (
    <div className="w-full space-y-6">
      {/* Header card — gradient band + integrated stats */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="relative overflow-hidden px-6 py-7 sm:px-8" style={{ background: GRADIENT }}>
          {/* decorative motif */}
          <Users className="pointer-events-none absolute -right-6 -top-8 h-44 w-44 rotate-12 text-white/10" />
          <ShieldCheck className="pointer-events-none absolute -bottom-10 right-24 h-32 w-32 -rotate-12 text-white/[0.07]" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Administration</p>
              <h1 className="mt-0.5 text-2xl font-bold text-white">Users &amp; Roles</h1>
              <p className="mt-1 max-w-xl text-sm text-white/80">Manage who can access the portal and what they can do — invite people, assign roles and control access.</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="white" icon={RefreshCw} onClick={refetch} className={cn('active:scale-95', loading && '[&_svg]:animate-spin')}>Refresh</Button>
              <Button variant="white" icon={UserPlus} onClick={() => { setEditing(null); setShowForm(true); }} className="active:scale-95">New user</Button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          <HeaderStat icon={Users} label="Total users" value={stats.total} />
          <HeaderStat icon={ShieldCheck} label="Admins" value={stats.admins} />
          <HeaderStat icon={UserCheck} label="Active" value={stats.active} />
          <HeaderStat icon={UserX} label="Inactive" value={stats.inactive} />
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
        {[
          { key: 'users', label: 'Users', Icon: Users },
          { key: 'roles', label: 'Roles', Icon: ShieldCheck },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn('relative isolate inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors', tab === t.key ? 'text-accent' : 'text-muted-foreground hover:text-foreground')}
          >
            {tab === t.key && <motion.span layoutId="usersTab" className="absolute inset-0 -z-10 rounded-md" style={accentTint(0.12)} transition={{ type: 'spring', stiffness: 500, damping: 34 }} />}
            <t.Icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'roles' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {ROLES.map((r) => (
            <RoleCard key={r.value} role={r} count={roleCounts[r.value] || 0} onView={() => { setTab('users'); setRoleFilter(r.value); }} />
          ))}
        </div>
      ) : error && users.length === 0 ? (
        <Card className="text-sm text-danger">Couldn&apos;t load users: {error.message}</Card>
      ) : (
        <>
          {/* Controls — search + view toggle */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="group relative sm:flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-all duration-200 focus:border-accent focus:[box-shadow:0_0_0_3px_color-mix(in_srgb,var(--color-accent)_16%,transparent)]"
              />
            </div>
            <div className="inline-flex shrink-0 self-start overflow-hidden rounded-xl border border-border bg-card sm:self-auto">
              {VIEWS.map((v, idx) => {
                const active = view === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setView(v.id)}
                    title={`${v.label} view`}
                    className={cn('relative isolate grid h-10 w-10 place-items-center transition-colors duration-200', idx > 0 && 'border-l border-border', active ? 'text-accent-foreground' : 'text-muted-foreground hover:text-accent')}
                  >
                    {active && <motion.span layoutId="usersViewActive" className="absolute inset-0 -z-10 bg-accent" transition={{ type: 'spring', stiffness: 500, damping: 34 }} />}
                    <v.Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters — status segmented control + role chips on one bar */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {/* Status — connected segmented control (single choice) */}
            <div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-border bg-card">
              {statusPills.map((p, idx) => {
                const active = statusFilter === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setStatusFilter(p.value)}
                    className={cn('relative isolate inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium transition-colors duration-200', idx > 0 && 'border-l border-border', active ? 'text-accent' : 'text-muted-foreground hover:text-foreground')}
                  >
                    {active && <motion.span layoutId="usersStatusActive" className="absolute inset-0 -z-10" style={accentTint(0.12)} transition={{ type: 'spring', stiffness: 500, damping: 34 }} />}
                    {p.label}
                    <span className={cn('text-xs tabular-nums', active ? 'text-accent/70' : 'text-muted-foreground')}>{p.count}</span>
                  </button>
                );
              })}
            </div>

            <span className="hidden h-5 w-px shrink-0 bg-border sm:block" aria-hidden="true" />

            {/* Role — multi-toggle filter chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRoleFilter('all')}
                className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors active:scale-95', roleFilter === 'all' ? 'border-accent text-accent' : 'border-border bg-card text-muted-foreground hover:text-foreground')}
              >
                All roles
              </button>
              {ROLES.map((r) => {
                const active = roleFilter === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRoleFilter(active ? 'all' : r.value)}
                    className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors active:scale-95', active ? 'text-foreground shadow-soft' : 'border-border bg-card text-muted-foreground hover:text-foreground')}
                    style={active ? { borderColor: r.color, backgroundColor: `${r.color}1f` } : undefined}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                    {r.label}
                    <span className={cn('tabular-nums', active ? 'opacity-80' : 'text-muted-foreground')}>{roleCounts[r.value] || 0}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          {users.length === 0 ? (
            <EmptyState icon={Users} title="No users yet" description="Create the first account to get started." action={<Button icon={UserPlus} onClick={() => { setEditing(null); setShowForm(true); }}>New user</Button>} />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
                {filtered.length === 0 ? (
                  <EmptyState icon={Search} title="No matching users" description="Try a different search, role or status." />
                ) : view === 'list' ? (
                  /* TABLE */
                  <Card className="overflow-hidden p-0">
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <SortHeader label="User" sortKey="name" sort={sort} onSort={onSort} />
                            <SortHeader label="Roles" sortKey="role" sort={sort} onSort={onSort} />
                            <SortHeader label="Joined" sortKey="createdAt" sort={sort} onSort={onSort} />
                            <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
                            <th className="px-4 py-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sorted.map((u) => (
                            <UserTableRow key={u._id} user={u} self={isSelf(u)} busy={busyId === u._id} onEdit={handleEdit} onReset={handleReset} onToggle={handleToggle} onDelete={handleDelete} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* mobile cards */}
                    <div className="divide-y divide-border md:hidden">
                      {sorted.map((u) => (
                        <UserMobileRow key={u._id} user={u} self={isSelf(u)} busy={busyId === u._id} onEdit={handleEdit} onReset={handleReset} onToggle={handleToggle} onDelete={handleDelete} />
                      ))}
                    </div>
                  </Card>
                ) : (
                  /* GRID */
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    <AnimatePresence>
                      {sorted.map((u) => (
                        <UserCard key={u._id} user={u} self={isSelf(u)} busy={busyId === u._id} onEdit={handleEdit} onReset={handleReset} onToggle={handleToggle} onDelete={handleDelete} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </>
      )}

      <UserFormModal open={showForm} onClose={() => setShowForm(false)} user={editing} onSaved={handleSaved} />
      <ResetPasswordModal open={!!resetting} onClose={() => setResetting(null)} user={resetting} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={removing}
        title="Delete user?"
        message={`"${deleting?.displayName}" will be permanently removed, along with any course data they own. This cannot be undone.`}
        confirmLabel="Delete user"
      />
      <ConfirmDialog
        open={!!toggling}
        onClose={() => setToggling(null)}
        onConfirm={() => toggleStatus(toggling)}
        loading={busyId === toggling?._id}
        tone={toggling?.isActive ? 'danger' : 'primary'}
        title={toggling?.isActive ? 'Deactivate user?' : 'Activate user?'}
        message={
          toggling?.isActive
            ? `"${toggling?.displayName}" will lose access to the portal until you reactivate them.`
            : `"${toggling?.displayName}" will regain access to the portal.`
        }
        confirmLabel={toggling?.isActive ? 'Deactivate' : 'Activate'}
      />
    </div>
  );
}

export default UsersRolesPage;
