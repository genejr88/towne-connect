import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Save, X, Loader2, BookTemplate } from 'lucide-react'
import toast from 'react-hot-toast'
import { templatesApi } from '../lib/api'

export default function Templates() {
  const qc = useQueryClient()
  const [adding, setAdding]   = useState(false)
  const [editing, setEditing] = useState(null) // { id, name, body }

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: templatesApi.list,
  })

  const createMut = useMutation({
    mutationFn: templatesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); setAdding(false) },
    onError: (e) => toast.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }) => templatesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); setEditing(null) },
    onError: (e) => toast.error(e.message),
  })

  const removeMut = useMutation({
    mutationFn: templatesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
    onError: (e) => toast.error(e.message),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 size={28} className="animate-spin text-sky-400" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BookTemplate size={20} className="text-sky-400" />
            Quick-Reply Templates
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Use <code className="bg-slate-800 px-1 rounded text-xs">{'{name}'}</code> to insert the customer's name.
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold transition-colors"
        >
          <Plus size={16} />
          New
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <TemplateForm
          onSave={(data) => createMut.mutate(data)}
          onCancel={() => setAdding(false)}
          saving={createMut.isPending}
        />
      )}

      {/* List */}
      <div className="space-y-2">
        {templates.map(t => (
          <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            {editing?.id === t.id ? (
              <TemplateForm
                initial={{ name: editing.name, body: editing.body }}
                onSave={(data) => updateMut.mutate({ id: t.id, ...data })}
                onCancel={() => setEditing(null)}
                saving={updateMut.isPending}
              />
            ) : (
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-200 text-sm">{t.name}</p>
                  <p className="text-sm text-slate-400 mt-1 whitespace-pre-wrap">{t.body}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditing({ id: t.id, name: t.name, body: t.body })}
                    className="p-2 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => { if (confirm('Delete this template?')) removeMut.mutate(t.id) }}
                    className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {templates.length === 0 && !adding && (
          <div className="text-center py-12 text-slate-500">
            <BookTemplate size={32} className="mx-auto mb-3" strokeWidth={1} />
            <p>No templates yet — add your first one!</p>
          </div>
        )}
      </div>
    </div>
  )
}

function TemplateForm({ initial, onSave, onCancel, saving }) {
  const [name, setName] = useState(initial?.name || '')
  const [body, setBody] = useState(initial?.body || '')

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Template name (e.g. Vehicle Ready)"
        className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
      />
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Hi {name}, your vehicle is ready for pickup..."
        rows={3}
        className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 resize-none"
      />
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-100 flex items-center gap-1">
          <X size={14} /> Cancel
        </button>
        <button
          onClick={() => onSave({ name, body })}
          disabled={!name.trim() || !body.trim() || saving}
          className="px-3 py-1.5 rounded-lg text-sm bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold flex items-center gap-1 transition-colors"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save
        </button>
      </div>
    </div>
  )
}
