import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  UserPlus,
  Search,
  ShieldCheck,
  Building2,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
} from 'lucide-react';

import { useAuth } from '../../../hooks/useAuth';
import { useCompany } from '../../../hooks/useCompany';
import { isSuperAdministrator } from '../../../utils/rbac.utils';
import { companiesApi } from '../../companies/api/companies.api';
import {
  usersApi,
  type UserResponse,
  type CreateUserData,
  type UpdateUserData,
  type UserRoleItem,
} from '../api/users.api';

export default function UserManagementPage() {
  const { t } = useTranslation(['settings', 'common']);
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();

  const superAdmin = isSuperAdministrator(user);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getUsers,
  });

  const { data: availableRoles = [], isLoading: isLoadingRoles } = useQuery<
    UserRoleItem[]
  >({
    queryKey: ['roles'],
    queryFn: usersApi.getRoles,
  });

  // A super administrator chooses the company for a new user, so the full
  // company list is loaded only for them.
  const { data: companies = [] } = useQuery({
    queryKey: ['company-settings'],
    queryFn: companiesApi.listSettings,
    enabled: superAdmin,
  });

  const createMutation = useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      closeModal();
    },
    onError: (err: unknown) =>
      setFormError(toMessage(err, 'Failed to add user')),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
      newRoleIds,
    }: {
      id: string;
      data: UpdateUserData;
      newRoleIds?: string[];
    }) => {
      const updatedUser = await usersApi.updateUser(id, data);

      if (selectedUser && newRoleIds) {
        const currentRoleIds = selectedUser.roles.map((r) => r.id);
        const rolesToAdd = newRoleIds.filter(
          (roleId) => !currentRoleIds.includes(roleId),
        );
        const rolesToRemove = currentRoleIds.filter(
          (roleId) => !newRoleIds.includes(roleId),
        );

        for (const roleId of rolesToAdd) {
          await usersApi.assignRole(id, roleId);
        }
        for (const roleId of rolesToRemove) {
          await usersApi.removeRole(id, roleId);
        }
      }

      return updatedUser;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      closeModal();
    },
    onError: (err: unknown) =>
      setFormError(toMessage(err, 'Failed to update user')),
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const openCreateModal = () => {
    setSelectedUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setCompanyId('');
    setSelectedRoleIds([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (target: UserResponse) => {
    setSelectedUser(target);
    setName(target.name);
    setEmail(target.email);
    setPassword('');
    setSelectedRoleIds(target.roles.map((r) => r.id));
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (selectedRoleIds.length === 0) {
      setFormError('Select at least one role for the user');
      return;
    }

    if (selectedUser) {
      const payload: UpdateUserData = { name, email };
      if (password) payload.password = password;
      updateMutation.mutate({
        id: selectedUser.id,
        data: payload,
        newRoleIds: selectedRoleIds,
      });
      return;
    }

    if (!password) {
      setFormError('Password is required');
      return;
    }

    if (superAdmin && !companyId) {
      setFormError('Select the company for the new user');
      return;
    }

    const payload: CreateUserData = {
      name,
      email,
      password,
      roleIds: selectedRoleIds,
      // A plain administrator's user is pinned to their active company by the
      // backend, so the field is only sent by a super administrator.
      ...(superAdmin ? { companyId } : {}),
    };
    createMutation.mutate(payload);
  };

  const handleToggleActive = (target: UserResponse) => {
    updateMutation.mutate({
      id: target.id,
      data: { isActive: !target.isActive },
    });
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  // Handing out the super administrator role is reserved for a super
  // administrator; the backend rejects it either way, so the option is hidden
  // rather than offered and then refused.
  const assignableRoles = superAdmin
    ? availableRoles
    : availableRoles.filter((role) => role.name !== 'SUPER_ADMINISTRATOR');

  return (
    <div className="space-y-6 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {t('settings:title')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {superAdmin
              ? 'Create, view, and edit users across every company.'
              : `Create, view, and edit users within ${activeCompany?.name ?? 'your company'}.`}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t('settings:addUser')}</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('settings:searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#D32F2F] focus:outline-none transition"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#D32F2F]" />
            <span>Loading user data...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">{t('settings:table.user')}</th>
                  <th className="py-3.5 px-6">{t('settings:table.roles')}</th>
                  {superAdmin && (
                    <th className="py-3.5 px-6">
                      {t('settings:table.company')}
                    </th>
                  )}
                  <th className="py-3.5 px-6">{t('settings:table.status')}</th>
                  <th className="py-3.5 px-6">
                    {t('settings:table.createdAt')}
                  </th>
                  <th className="py-3.5 px-6 text-right">
                    {t('settings:table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={superAdmin ? 6 : 5}
                      className="py-8 text-center text-slate-400"
                    >
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-red-50 text-[#D32F2F] border border-red-100 font-bold flex items-center justify-center shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{u.name}</p>
                            <p className="text-[11px] text-slate-400">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1.5">
                          {u.roles.map((r) => (
                            <span
                              key={r.id}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-red-50 text-[#D32F2F] text-[10px] font-bold border border-red-100/80"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              {r.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      {superAdmin && (
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1.5">
                            {u.companies.length === 0 ? (
                              <span className="text-[11px] text-slate-400">
                                -
                              </span>
                            ) : (
                              u.companies.map((c) => (
                                <span
                                  key={c.id}
                                  title={c.name}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200"
                                >
                                  <Building2 className="w-3 h-3" />
                                  {c.code}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                      )}
                      <td className="py-4 px-6">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {u.isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{t('settings:status.active')}</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" />
                              <span>{t('settings:status.inactive')}</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-slate-500 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(t('settings:confirmDelete'))) {
                                deleteMutation.mutate(u.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-100 overflow-hidden space-y-4">
            <div className="p-5 pb-0 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {selectedUser
                  ? t('settings:modal.editTitle')
                  : t('settings:modal.createTitle')}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 pt-0 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  {t('settings:modal.nameLabel')}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none transition"
                  placeholder="John Smith"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  {t('settings:modal.emailLabel')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none transition"
                  placeholder="john@onduline.com"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  {t('settings:modal.passwordLabel')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!selectedUser}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none transition"
                  placeholder="••••••••••••"
                />
                {selectedUser && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {t('settings:modal.passwordHint')}
                  </p>
                )}
              </div>

              {/* A super administrator picks the company on create. An
                  administrator's user is pinned to their active company, so the
                  field is replaced by a read-only note. */}
              {!selectedUser &&
                (superAdmin ? (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      {t('settings:modal.companyLabel')}
                    </label>
                    <select
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-[#D32F2F] focus:outline-none transition"
                    >
                      <option value="" disabled>
                        {t('settings:modal.companyPlaceholder')}
                      </option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500">
                    <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span>
                      {t('settings:modal.companyPinned', {
                        company: activeCompany?.name ?? 'your company',
                      })}
                    </span>
                  </p>
                ))}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  {t('settings:modal.rolesLabel')}
                </label>
                {isLoadingRoles ? (
                  <div className="p-3 text-center text-xs text-slate-400">
                    Loading role data...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {assignableRoles.map((r) => (
                      <label
                        key={r.id}
                        className={`p-2 rounded-xl border text-xs cursor-pointer flex items-center gap-2 transition ${
                          selectedRoleIds.includes(r.id)
                            ? 'bg-red-50 border-[#D32F2F] text-[#D32F2F] font-bold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRoleIds.includes(r.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoleIds([...selectedRoleIds, r.id]);
                            } else {
                              setSelectedRoleIds(
                                selectedRoleIds.filter((id) => id !== r.id),
                              );
                            }
                          }}
                          className="sr-only"
                        />
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{r.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  {t('settings:modal.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  className="px-4 py-2 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Processing...'
                    : selectedUser
                      ? t('settings:modal.save')
                      : t('settings:modal.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/** Pulls a readable message out of an axios-style error. */
function toMessage(err: unknown, fallback: string): string {
  const response = (err as { response?: { data?: { message?: unknown } } })
    .response;
  const message = response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(', ');
  }

  if (typeof message === 'string') {
    return message;
  }

  return err instanceof Error ? err.message : fallback;
}
