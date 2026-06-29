import { useMemo, useState } from 'react';
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
import { ROLES, roleMeta, isAdminUser } from './usersUtils';

const GRADIENT = 'linear-gradient(120deg, var(--color-primary), var(--color-accent))';
const accentTint = (a) => ({ backgroundColor: `rgba(var(--color-accent-rgb), ${a})` });

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

function StatusChip({ active }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold', active ? 'text-success' : 'text-muted-foreground')} style={{ backgroundColor: active ? 'rgba(46,125,50,0.12)' : 'var(--color-muted)' }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active ? '#2e7d32' : 'var(--color-mutedForeground)' }} />
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

// Roles in seniority order, with any unknown/legacy roles appended.
const orderRoles = (roles = []) => {
  const known = ROLES.filter((r) => roles.includes(r.value)).map((r) => r.value);
  return [...known, ...roles.filter((r) => !known.includes(r))];
};

export function UsersRolesPage() {
  const { user: me } = useAuth();
  const myId = String(me?._id || me?.id || '');
  const { data, loading, error, refetch } = useApi(() => UserService.list(), []);
  const users = useMemo(() => data || [], [data]);

  const [tab, setTab] = useState('users'); // 'users' | 'roles'
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const isSelf = (u) => String(u._id) === myId;

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

  const toggleStatus = async (u) => {
    setBusyId(u._id);
    try {
      await UserService.setStatus(u._id, !u.isActive);
      toast.success(u.isActive ? 'User deactivated' : 'User activated');
      refetch();
    } catch (e) {
      toast.error(e.message || 'Failed to update');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await UserService.remove(deleting._id);
      toast.success('User deleted');
      setDeleting(null);
      refetch();
    } catch (e) {
      toast.error(e.message || 'Failed to delete');
    } finally {
      setRemoving(false);
    }
  };

  if (loading && !data) return <AdminLoader label="Loading users…" />;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-start justify-between gap-4 px-6 py-7 sm:px-8" style={{ background: GRADIENT }}>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Administration</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Users &amp; Roles</h1>
            <p className="mt-1 max-w-xl text-sm text-white/80">Manage who can access the portal and what they can do — invite people, assign roles and control access.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="white" icon={RefreshCw} onClick={refetch} className={cn(loading && '[&_svg]:animate-spin')}>Refresh</Button>
            <Button variant="white" icon={UserPlus} onClick={() => { setEditing(null); setShowForm(true); }}>New user</Button>
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

      {error ? (
        <Card className="text-sm text-danger">Couldn&apos;t load users: {error.message}</Card>
      ) : tab === 'roles' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {ROLES.map((r) => (
            <Card key={r.value} className="flex flex-col p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${r.color}1f`, color: r.color }}>
                  <r.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{r.label}</h3>
                    {r.admin ? <span className="rounded-pill px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ backgroundColor: `${r.color}1f`, color: r.color }}>Admin</span> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{roleCounts[r.value] || 0} {roleCounts[r.value] === 1 ? 'member' : 'members'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setTab('users'); setRoleFilter(r.value); }}
                  className="shrink-0 text-xs font-medium text-accent hover:underline"
                >
                  View
                </button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{r.description}</p>
              <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                {r.permissions.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-xs text-foreground">
                    <Check className="h-3.5 w-3.5 shrink-0" style={{ color: r.color }} /> {p}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative md:flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-accent"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {statusPills.map((p) => {
                const active = statusFilter === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setStatusFilter(p.value)}
                    className={cn('relative isolate inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors', active ? 'border-accent text-accent' : 'border-border bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground')}
                  >
                    {active && <motion.span layoutId="usersStatusActive" className="absolute inset-0 -z-10 rounded-full" style={accentTint(0.1)} transition={{ type: 'spring', stiffness: 500, damping: 34 }} />}
                    {p.label}
                    <span className={cn('text-xs', active ? 'text-accent/70' : 'text-muted-foreground')}>{p.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role filter */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRoleFilter('all')}
              className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors', roleFilter === 'all' ? 'border-accent text-accent' : 'border-border bg-card text-muted-foreground hover:text-foreground')}
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
                  className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors', active ? 'text-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground')}
                  style={active ? { borderColor: r.color, backgroundColor: `${r.color}1f` } : undefined}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                  {r.label}
                  <span className={cn('tabular-nums', active ? 'opacity-80' : 'text-muted-foreground')}>{roleCounts[r.value] || 0}</span>
                </button>
              );
            })}
          </div>

          {/* Table */}
          {users.length === 0 ? (
            <EmptyState icon={Users} title="No users yet" description="Create the first account to get started." action={<Button icon={UserPlus} onClick={() => { setEditing(null); setShowForm(true); }}>New user</Button>} />
          ) : filtered.length === 0 ? (
            <EmptyState icon={Search} title="No matching users" description="Try a different search, role or status." />
          ) : (
            <Card className="overflow-hidden p-0">
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3.5">User</th>
                      <th className="px-4 py-3.5">Roles</th>
                      <th className="px-4 py-3.5">Joined</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {filtered.map((u) => {
                        const self = isSelf(u);
                        return (
                          <motion.tr key={u._id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="group border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar name={u.displayName} src={u.profileImage} size="sm" />
                                <div className="min-w-0">
                                  <p className="flex items-center gap-1.5 truncate font-medium text-foreground">
                                    {u.displayName}
                                    {self ? <span className="rounded-pill bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">You</span> : null}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {orderRoles(u.roles).map((r) => <RoleBadge key={r} role={r} />)}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(u.createdAt)}</td>
                            <td className="px-4 py-3"><StatusChip active={u.isActive} /></td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <Button size="iconSm" variant="ghost" icon={Power} loading={busyId === u._id} onClick={() => toggleStatus(u)} disabled={self} title={self ? "You can't change your own status" : u.isActive ? 'Deactivate' : 'Activate'} />
                                <Button size="iconSm" variant="ghost" icon={Pencil} onClick={() => { setEditing(u); setShowForm(true); }} title="Edit" />
                                <Button size="iconSm" variant="ghost" icon={KeyRound} onClick={() => setResetting(u)} title="Reset password" />
                                <Button size="iconSm" variant="dangerGhost" icon={Trash2} onClick={() => setDeleting(u)} disabled={self} title={self ? "You can't delete your own account" : 'Delete'} />
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="divide-y divide-border md:hidden">
                {filtered.map((u) => (
                  <div key={u._id} className="flex items-start gap-3 p-4">
                    <Avatar name={u.displayName} src={u.profileImage} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate font-medium text-foreground">
                        {u.displayName}
                        {isSelf(u) ? <span className="rounded-pill bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">You</span> : null}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">{orderRoles(u.roles).map((r) => <RoleBadge key={r} role={r} />)}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <StatusChip active={u.isActive} />
                        <Button size="iconSm" variant="ghost" icon={Pencil} onClick={() => { setEditing(u); setShowForm(true); }} title="Edit" />
                        <Button size="iconSm" variant="ghost" icon={KeyRound} onClick={() => setResetting(u)} title="Reset password" />
                        <Button size="iconSm" variant="ghost" icon={Power} loading={busyId === u._id} onClick={() => toggleStatus(u)} disabled={isSelf(u)} title="Toggle status" />
                        <Button size="iconSm" variant="dangerGhost" icon={Trash2} onClick={() => setDeleting(u)} disabled={isSelf(u)} title="Delete" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      <UserFormModal open={showForm} onClose={() => setShowForm(false)} user={editing} onSaved={() => refetch()} />
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
    </div>
  );
}

export default UsersRolesPage;
