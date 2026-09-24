import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth'
import ForgotPassword from '../components/ForgotPassword'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch {
      setError('Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={28} className="text-sky-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Towne Connect</h1>
          <p className="text-slate-400 text-sm mt-1">Customer messaging hub</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Username</label>
            <input
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="gene"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Sign In
          </button>
        </form>
        <ForgotPassword />
      </div>
    </div>
  )
}
