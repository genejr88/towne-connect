import { Link, useLocation } from 'react-router-dom'
import { MessageSquare, BookTemplate, Users, LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../lib/auth'

const nav = [
  { to: '/',          label: 'Inbox',     icon: MessageSquare },
  { to: '/templates', label: 'Templates', icon: BookTemplate },
]

export default function Header() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="flex-shrink-0 h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-4">
      {/* Brand */}
      <div className="flex items-center gap-2 font-bold text-slate-100 mr-4">
        <MessageSquare size={18} className="text-sky-400" />
        <span>Towne Connect</span>
      </div>

      {/* Nav */}
      <nav className="flex items-center gap-1 flex-1">
        {nav.map(({ to, label, icon: Icon }) => {
          const active = to === '/' ? pathname === '/' || pathname.startsWith('/c/') : pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-sky-500/15 text-sky-400'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          )
        })}
        {user?.role === 'ADMIN' && (
          <Link
            to="/users"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/users'
                ? 'bg-sky-500/15 text-sky-400'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <Users size={15} />
            Users
          </Link>
        )}
      </nav>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-xs">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <span className="hidden sm:block">{user?.name}</span>
          <ChevronDown size={14} className="text-slate-500" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 py-1">
            <button
              onClick={() => { logout(); setMenuOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-red-400 transition-colors"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
