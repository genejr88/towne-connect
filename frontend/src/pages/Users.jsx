import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Loader2, Users as UsersIcon, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { usersApi } from '../lib/api'
import { useAuth } from '../lib/auth'

export default function Users() {
  const qc = useQueryClient()
  const { user: me } = useAuth()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', username: '', password: '', role: 'USER' })

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  })

  const createMut = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setAdding(false); setForm({ name:'', email:'', username:'', password:'', role:'USER' }) },
    onError: (e) => toast.error(e.message),
  })

  const removeMut = useMutation({
    mutationFn: usersApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (e) => toast.error(e.message),
  })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <UsersIcon size={20} className="text-sky-400" />
          Staff Users
        </h1>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold transition-colors"
        >
          <Plus size={16} />
          Add User
        </button>
      </div>

      {adding && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-200">New User</p>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.name}     onChange={set('name')}     placeholder="Full name"  className="input" />
            <input value={form.username} onChange={set('username')} placeholder="Username"   className="input" />
            <input value={form.email}    onChange={set('email')}    placeholder="Email"      className="input" type="email" />
            <input value={form.password} onChange={set('password')} placeholder="Password"   className="input" type="password" />
          </div>
          <div className="flex items-center gap-3">
            <select value={form.role} onChange={set('role')} className="input flex-1">
              <option value="USER">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button onClick={() => setAdding(false)} className="px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-100">Cancel</button>
            <button
              onClick={() => createMut.mutate(form)}
              disabled={!form.name || !form.email || !form.username || !form.password || createMut.isPending}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {createMut.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Create'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-sky-400" /></div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-sm flex-shrink-0">
                {u.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-200 text-sm">{u.name}</p>
                  {u.role === 'ADMIN' && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full">
                      <Shield size={9} />Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">@{u.username} · {u.email}</p>
              </div>
              {u.id !== me?.id && (
                <button
                  onClick={() => { if (confirm(`Delete ${u.name}?`)) removeMut.mutate(u.id) }}
                  className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
