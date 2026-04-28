'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createUser, updateUser, deleteUser } from '@/app/actions/users'

type UserRow = {
  _id: string
  name: string
  email: string
  role: string
  permissions: string[]
}

const ROLES = ['admin', 'scout', 'viewer'] as const

const PERMISSIONS = [
  { id: 'sync:events', label: 'Sync Events' },
  { id: 'sync:teams', label: 'Sync Teams' },
  { id: 'users:manage', label: 'Manage Users' },
] as const

const inputCls =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      {children}
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const cls =
    role === 'admin'
      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
      : role === 'scout'
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {role}
    </span>
  )
}

export default function UsersClient({
  users,
  currentUserId,
}: {
  users: UserRow[]
  currentUserId: string
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<UserRow | null | 'new'>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function openCreate() {
    setEditing('new')
    setFormError(null)
  }

  function openEdit(user: UserRow) {
    setEditing(user)
    setFormError(null)
  }

  function closeForm() {
    setEditing(null)
    setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setFormError(null)

    const formData = new FormData(e.currentTarget)
    const result =
      editing !== 'new' && editing !== null
        ? await updateUser(undefined, formData)
        : await createUser(undefined, formData)

    setPending(false)

    if (result?.success) {
      closeForm()
      router.refresh()
    } else {
      setFormError(result?.error ?? 'Something went wrong.')
    }
  }

  async function handleDelete(userId: string) {
    const result = await deleteUser(userId)
    if (result?.success) {
      setConfirmDelete(null)
      router.refresh()
    }
  }

  const isEditing = editing !== null && editing !== 'new'
  const editUser = isEditing ? (editing as UserRow) : null

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Users</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage user accounts, roles, and permissions.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="h-9 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Add User
        </button>
      </div>

      {/* Inline form panel */}
      {editing !== null && (
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-5 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {editing === 'new' ? 'Add User' : 'Edit User'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {editUser && <input type="hidden" name="id" value={editUser._id} />}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input
                  name="name"
                  required
                  defaultValue={editUser?.name ?? ''}
                  placeholder="Jane Smith"
                  className={inputCls}
                />
              </Field>

              <Field label="Email">
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={editUser?.email ?? ''}
                  placeholder="jane@example.com"
                  className={inputCls}
                />
              </Field>

              <Field label={editUser ? 'New Password' : 'Password'}>
                <input
                  name="password"
                  type="password"
                  required={!editUser}
                  placeholder={editUser ? 'Leave blank to keep current' : ''}
                  className={inputCls}
                />
              </Field>

              <Field label="Role">
                <select name="role" defaultValue={editUser?.role ?? 'viewer'} className={inputCls}>
                  {ROLES.map(r => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Permissions">
              <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
                {PERMISSIONS.map(p => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    <input
                      type="checkbox"
                      name="permissions"
                      value={p.id}
                      defaultChecked={editUser?.permissions.includes(p.id)}
                      className="rounded border-zinc-300 dark:border-zinc-600"
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </Field>

            {formError && (
              <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={pending}
                className="h-9 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {pending ? 'Saving…' : editUser ? 'Save Changes' : 'Create User'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="h-9 rounded-lg border border-zinc-200 px-4 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Permissions
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-400">
                  No users yet.
                </td>
              </tr>
            )}
            {users.map(user => (
              <tr key={user._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                  {user.name}
                </td>
                <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{user.email}</td>
                <td className="px-4 py-3">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-4 py-3">
                  {user.permissions.length === 0 ? (
                    <span className="text-zinc-300 dark:text-zinc-600">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {user.permissions.map(p => (
                        <span
                          key={p}
                          className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {confirmDelete === user._id ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-xs text-zinc-400">Delete?</span>
                      <button
                        onClick={() => handleDelete(user._id)}
                        className="text-xs font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-4">
                      <button
                        onClick={() => openEdit(user)}
                        className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                      >
                        Edit
                      </button>
                      {user._id !== currentUserId && (
                        <button
                          onClick={() => setConfirmDelete(user._id)}
                          className="text-xs font-medium text-red-500 hover:text-red-700 dark:hover:text-red-400"
                        >
                          Delete
                        </button>
                      )}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
