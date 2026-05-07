import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Search, Plus, Send, StickyNote, ChevronLeft, Phone, Link2,
  X, CheckCheck, MessageSquare, Loader2, Trash2, Car, ExternalLink,
  MoreVertical, CheckCircle2,
} from 'lucide-react'
import { conversationsApi, contactsApi, templatesApi, partsApi } from '../lib/api'
import { formatPhone, timeAgo, formatTime, applyTemplate } from '../lib/utils'
import { useAuth } from '../lib/auth'

// ── Polling interval for live updates ─────────────────────────────────────────
const POLL_MS = 4000

export default function Inbox() {
  const { id: activeId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()

  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('OPEN')
  const [newOpen, setNewOpen]       = useState(false)
  const [newPhone, setNewPhone]     = useState('')
  const [newName, setNewName]       = useState('')
  const [creating, setCreating]     = useState(false)

  // ── Conversation list (polled) ─────────────────────────────────────────────
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', filter, search],
    queryFn: () => conversationsApi.list({ status: filter, search: search || undefined }),
    refetchInterval: POLL_MS,
  })

  // ── Active conversation (polled) ───────────────────────────────────────────
  const { data: conv } = useQuery({
    queryKey: ['conversation', activeId],
    queryFn: () => conversationsApi.get(activeId),
    enabled: !!activeId,
    refetchInterval: POLL_MS,
  })

  // ── Open a conversation ────────────────────────────────────────────────────
  const openConv = (id) => navigate(`/c/${id}`)

  // ── Start new conversation ─────────────────────────────────────────────────
  const handleNew = async () => {
    if (!newPhone.trim()) return
    setCreating(true)
    try {
      const c = await conversationsApi.create({ phone: newPhone.trim(), name: newName.trim() || undefined })
      qc.invalidateQueries({ queryKey: ['conversations'] })
      setNewOpen(false)
      setNewPhone('')
      setNewName('')
      navigate(`/c/${c.id}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCreating(false)
    }
  }

  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0)

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div className={`flex flex-col border-r border-slate-800 bg-slate-900 ${
        activeId ? 'hidden md:flex w-80 flex-shrink-0' : 'flex-1 md:w-80 md:flex-none md:flex-shrink-0'
      }`}>
        {/* Search + New */}
        <div className="p-3 space-y-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name or phone…"
                className="w-full bg-slate-800 border border-slate-700/60 rounded-xl pl-8 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/60"
              />
            </div>
            <button
              onClick={() => setNewOpen(true)}
              className="w-9 h-9 rounded-xl bg-sky-500 hover:bg-sky-400 flex items-center justify-center text-white flex-shrink-0 transition-colors"
              title="New conversation"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Filter pills */}
          <div className="flex gap-1.5">
            {['OPEN', 'RESOLVED'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  filter === s
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {s === 'OPEN' ? `Open${totalUnread > 0 && filter === 'OPEN' ? ` · ${totalUnread}` : ''}` : 'Resolved'}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm gap-2">
              <MessageSquare size={24} />
              <p>{search ? 'No results' : 'No conversations yet'}</p>
            </div>
          ) : (
            conversations.map(c => (
              <ConvRow
                key={c.id}
                conv={c}
                active={c.id === activeId}
                onClick={() => openConv(c.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Thread panel ────────────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col overflow-hidden ${!activeId ? 'hidden md:flex' : 'flex'}`}>
        {activeId && conv ? (
          <Thread conv={conv} user={user} onBack={() => navigate('/')} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-3">
            <MessageSquare size={48} strokeWidth={1} />
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm">or start a new one with the + button</p>
          </div>
        )}
      </div>

      {/* ── New Conversation Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {newOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-800 border border-slate-700 rounded-2xl p-5 w-full max-w-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-100">New Conversation</h2>
                <button onClick={() => setNewOpen(false)} className="text-slate-400 hover:text-slate-100">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Phone Number *</label>
                  <input
                    autoFocus
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleNew()}
                    placeholder="(555) 000-0000"
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Name (optional)</label>
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleNew()}
                    placeholder="Customer name"
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setNewOpen(false)} className="flex-1 py-2.5 rounded-xl bg-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-600 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleNew}
                  disabled={!newPhone.trim() || creating}
                  className="flex-1 py-2.5 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 size={16} className="animate-spin" /> : null}
                  Start Chat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Conversation row in sidebar ───────────────────────────────────────────────
function ConvRow({ conv, active, onClick }) {
  const name = conv.contact?.name || formatPhone(conv.contact?.phone)
  const preview = conv.lastMessagePreview || '—'

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-3 border-b border-slate-800/50 flex items-start gap-3 transition-colors ${
        active ? 'bg-sky-500/10 border-l-2 border-l-sky-500' : 'hover:bg-slate-800/50'
      }`}
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 text-sm font-bold text-slate-300">
        {name?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm font-semibold text-slate-100 truncate">{name}</span>
          <span className="text-[10px] text-slate-500 flex-shrink-0">{timeAgo(conv.lastMessageAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className="text-xs text-slate-400 truncate">{preview}</p>
          {conv.unreadCount > 0 && (
            <span className="flex-shrink-0 bg-sky-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
            </span>
          )}
        </div>
        {conv.linkedRoNumber && (
          <p className="text-[10px] text-sky-400 mt-0.5">RO #{conv.linkedRoNumber}</p>
        )}
      </div>
    </button>
  )
}

// ── Thread (full conversation view) ──────────────────────────────────────────
function Thread({ conv, user, onBack }) {
  const qc = useQueryClient()
  const messagesEndRef = useRef(null)
  const [msg, setMsg]           = useState('')
  const [noteMode, setNoteMode] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [sending, setSending]   = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [roSearch, setRoSearch] = useState('')
  const [showRoSearch, setShowRoSearch] = useState(false)

  const contact = conv.contact || {}
  const name = contact.name || formatPhone(contact.phone)
  const items = [
    ...conv.messages.map(m => ({ ...m, _type: 'msg' })),
    ...conv.notes.map(n => ({ ...n, _type: 'note' })),
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [items.length])

  // Templates
  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: templatesApi.list,
  })

  // Send message
  const sendMsg = useMutation({
    mutationFn: (body) => conversationsApi.sendMessage(conv.id, body),
    onSuccess: () => {
      setMsg('')
      qc.invalidateQueries({ queryKey: ['conversation', conv.id] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (err) => toast.error(err.message),
  })

  // Add note
  const addNote = useMutation({
    mutationFn: (body) => conversationsApi.addNote(conv.id, body),
    onSuccess: () => {
      setNoteText('')
      setNoteMode(false)
      qc.invalidateQueries({ queryKey: ['conversation', conv.id] })
    },
    onError: (err) => toast.error(err.message),
  })

  // Delete note
  const deleteNote = useMutation({
    mutationFn: (noteId) => conversationsApi.deleteNote(conv.id, noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversation', conv.id] }),
    onError: (err) => toast.error(err.message),
  })

  // Resolve / reopen
  const updateStatus = useMutation({
    mutationFn: (status) => conversationsApi.update(conv.id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversation', conv.id] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  // Link RO
  const linkRo = useMutation({
    mutationFn: (ro) => conversationsApi.update(conv.id, {
      linkedRoId: ro.id,
      linkedRoNumber: ro.roNumber,
      linkedCustomerName: ro.ownerName,
      linkedVehicle: `${ro.vehicleYear || ''} ${ro.vehicleMake || ''} ${ro.vehicleModel || ''}`.trim(),
    }),
    onSuccess: () => {
      setShowRoSearch(false)
      qc.invalidateQueries({ queryKey: ['conversation', conv.id] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
      toast.success('RO linked!')
    },
  })

  // Update contact name
  const updateContact = useMutation({
    mutationFn: (name) => contactsApi.update(contact.id, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversation', conv.id] }),
  })

  const handleSend = () => {
    const body = msg.trim()
    if (!body) return
    sendMsg.mutate(body)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend()
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-800 bg-slate-900 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="md:hidden p-1.5 text-slate-400 hover:text-slate-100">
          <ChevronLeft size={20} />
        </button>

        <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300 flex-shrink-0">
          {name[0]?.toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-100 truncate">{name}</p>
          <p className="text-xs text-slate-400">{formatPhone(contact.phone)}</p>
        </div>

        {/* Linked RO badge */}
        {conv.linkedRoNumber && (
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-sky-500/15 border border-sky-500/30 rounded-lg">
            <Car size={12} className="text-sky-400" />
            <span className="text-xs text-sky-300 font-semibold">RO #{conv.linkedRoNumber}</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          {/* Resolve/Reopen */}
          <button
            onClick={() => updateStatus.mutate(conv.status === 'OPEN' ? 'RESOLVED' : 'OPEN')}
            className={`p-2 rounded-lg text-sm transition-colors ${
              conv.status === 'RESOLVED'
                ? 'text-emerald-400 hover:bg-emerald-500/10'
                : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
            }`}
            title={conv.status === 'OPEN' ? 'Mark resolved' : 'Reopen'}
          >
            <CheckCircle2 size={18} />
          </button>
          {/* Info panel */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-lg transition-colors ${showInfo ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'}`}
            title="Customer info"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {items.map((item) =>
              item._type === 'note' ? (
                <NoteItem
                  key={`note-${item.id}`}
                  note={item}
                  canDelete={item.createdById === user?.id || user?.role === 'ADMIN'}
                  onDelete={() => deleteNote.mutate(item.id)}
                />
              ) : (
                <MessageBubble key={`msg-${item.id}`} msg={item} />
              )
            )}
            {items.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-slate-600 gap-2">
                <MessageSquare size={32} strokeWidth={1} />
                <p className="text-sm">No messages yet — send the first one!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply box */}
          <div className="flex-shrink-0 border-t border-slate-800 p-3 space-y-2 bg-slate-900">
            {/* Template picker trigger */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="text-xs text-sky-400 hover:text-sky-300 font-semibold transition-colors"
              >
                Quick Templates
              </button>
              <span className="text-slate-700">·</span>
              <button
                onClick={() => setNoteMode(!noteMode)}
                className={`text-xs font-semibold transition-colors ${
                  noteMode ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'
                }`}
              >
                {noteMode ? '📝 Note mode on' : 'Add internal note'}
              </button>
            </div>

            {/* Template list */}
            <AnimatePresence>
              {showTemplates && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-1.5 overflow-hidden"
                >
                  {templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setMsg(applyTemplate(t.body, contact.name))
                        setShowTemplates(false)
                        setNoteMode(false)
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 transition-colors"
                    >
                      {t.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Note textarea */}
            {noteMode ? (
              <div className="flex gap-2">
                <textarea
                  autoFocus
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Internal note (never sent to customer)…"
                  rows={2}
                  className="flex-1 bg-amber-500/5 border border-amber-500/30 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 resize-none"
                />
                <button
                  onClick={() => addNote.mutate(noteText)}
                  disabled={!noteText.trim() || addNote.isPending}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors"
                >
                  {addNote.isPending ? <Loader2 size={16} className="animate-spin" /> : <StickyNote size={16} />}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <textarea
                  value={msg}
                  onChange={e => setMsg(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message… (Ctrl+Enter to send)"
                  rows={2}
                  className="flex-1 bg-slate-800 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/60 resize-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!msg.trim() || sendMsg.isPending}
                  className="px-3 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white rounded-xl transition-colors"
                >
                  {sendMsg.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info panel */}
        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex-shrink-0 border-l border-slate-800 bg-slate-900 overflow-y-auto overflow-x-hidden"
            >
              <InfoPanel
                conv={conv}
                contact={contact}
                onLinkRo={() => setShowRoSearch(true)}
                onUnlinkRo={() => conversationsApi.update(conv.id, {
                  linkedRoId: null, linkedRoNumber: null, linkedCustomerName: null, linkedVehicle: null,
                }).then(() => qc.invalidateQueries({ queryKey: ['conversation', conv.id] }))}
                onUpdateName={(name) => updateContact.mutate(name)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RO Search Modal */}
      <AnimatePresence>
        {showRoSearch && (
          <RoSearchModal
            onClose={() => setShowRoSearch(false)}
            onSelect={(ro) => linkRo.mutate(ro)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const out = msg.direction === 'OUTBOUND'
  return (
    <div className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
        out
          ? 'bg-sky-500 text-white rounded-br-sm'
          : 'bg-slate-800 text-slate-100 rounded-bl-sm'
      }`}>
        <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
        <div className={`flex items-center gap-1 mt-1 ${out ? 'justify-end' : 'justify-start'}`}>
          <p className={`text-[10px] ${out ? 'text-sky-200' : 'text-slate-500'}`}>
            {out && msg.sentBy ? `${msg.sentBy.name} · ` : ''}
            {formatTime(msg.createdAt)}
          </p>
          {out && msg.status === 'DELIVERED' && <CheckCheck size={10} className="text-sky-200" />}
          {out && msg.status === 'FAILED' && <span className="text-[10px] text-red-300">Failed</span>}
        </div>
      </div>
    </div>
  )
}

// ── Note item ─────────────────────────────────────────────────────────────────
function NoteItem({ note, canDelete, onDelete }) {
  return (
    <div className="flex justify-center">
      <div className="max-w-[85%] bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 relative group">
        <div className="flex items-center gap-1.5 mb-0.5">
          <StickyNote size={11} className="text-amber-400" />
          <span className="text-[10px] font-semibold text-amber-400">
            {note.createdBy?.name} · {formatTime(note.createdAt)}
          </span>
          {canDelete && (
            <button
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400 ml-auto"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
        <p className="text-xs text-amber-200 whitespace-pre-wrap">{note.body}</p>
      </div>
    </div>
  )
}

// ── Info panel (right side) ───────────────────────────────────────────────────
function InfoPanel({ conv, contact, onLinkRo, onUnlinkRo, onUpdateName }) {
  const [editName, setEditName] = useState(false)
  const [nameVal, setNameVal]   = useState(contact.name || '')

  return (
    <div className="p-4 space-y-5 w-[280px]">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Contact</p>

      {/* Name */}
      <div>
        {editName ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { onUpdateName(nameVal); setEditName(false) }
                if (e.key === 'Escape') setEditName(false)
              }}
              className="flex-1 bg-slate-800 border border-sky-500/40 rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:outline-none"
            />
            <button onClick={() => { onUpdateName(nameVal); setEditName(false) }}
              className="text-sky-400 text-xs font-semibold">Save</button>
          </div>
        ) : (
          <button onClick={() => setEditName(true)} className="text-left w-full group">
            <p className="text-sm font-semibold text-slate-200 group-hover:text-sky-400 transition-colors">
              {contact.name || <span className="text-slate-500 italic">Unnamed — tap to add</span>}
            </p>
          </button>
        )}
        <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
          <Phone size={11} />
          {formatPhone(contact.phone)}
        </div>
      </div>

      {/* Linked RO */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Linked RO</p>
        {conv.linkedRoNumber ? (
          <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-sky-400">RO #{conv.linkedRoNumber}</span>
              <button onClick={onUnlinkRo} className="text-slate-500 hover:text-red-400 transition-colors">
                <X size={13} />
              </button>
            </div>
            {conv.linkedCustomerName && (
              <p className="text-xs text-slate-300">{conv.linkedCustomerName}</p>
            )}
            {conv.linkedVehicle && (
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Car size={11} />
                {conv.linkedVehicle}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onLinkRo}
            className="w-full py-2 rounded-xl border border-dashed border-slate-700 text-slate-500 hover:border-sky-500/50 hover:text-sky-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Link2 size={12} />
            Link to RO
          </button>
        )}
      </div>

      {/* Status */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Status</p>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
          conv.status === 'OPEN'
            ? 'bg-emerald-500/15 text-emerald-400'
            : 'bg-slate-700 text-slate-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${conv.status === 'OPEN' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          {conv.status}
        </span>
      </div>
    </div>
  )
}

// ── RO Search Modal ───────────────────────────────────────────────────────────
function RoSearchModal({ onClose, onSelect }) {
  const [search, setSearch] = useState('')

  const { data: ros = [], isLoading } = useQuery({
    queryKey: ['parts-ros', search],
    queryFn: () => partsApi.searchRos(search),
    enabled: search.length >= 1,
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-800 border border-slate-700 rounded-2xl p-5 w-full max-w-md space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-100">Link to RO</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100"><X size={18} /></button>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by RO number or customer name…"
            className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="max-h-60 overflow-y-auto space-y-1">
          {isLoading && <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-sky-400" /></div>}
          {!isLoading && ros.length === 0 && search.length >= 1 && (
            <p className="text-sm text-slate-500 text-center py-4">No ROs found</p>
          )}
          {ros.map(ro => (
            <button
              key={ro.id}
              onClick={() => onSelect(ro)}
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-sky-400">RO #{ro.roNumber}</span>
                <Car size={13} className="text-slate-500" />
              </div>
              <p className="text-xs text-slate-300">{ro.ownerName}</p>
              {(ro.vehicleMake || ro.vehicleModel) && (
                <p className="text-xs text-slate-500">{[ro.vehicleYear, ro.vehicleMake, ro.vehicleModel].filter(Boolean).join(' ')}</p>
              )}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
