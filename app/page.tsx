'use client'

import { useEffect, useState } from 'react'
import { TEAM_MEMBERS, type TeamMember } from '@/lib/teamMembers'

export default function Home() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [editTask, setEditTask] = useState('')

  // Initialize selected member from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('selectedMemberId')
    if (saved) setSelectedMemberId(saved)
  }, [])

  // Save selected member to localStorage
  useEffect(() => {
    if (selectedMemberId) {
      localStorage.setItem('selectedMemberId', selectedMemberId)
    }
  }, [selectedMemberId])

  // Fetch members data
  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members')
      const data = await res.json()
      setMembers(data)
    } catch (error) {
      console.error('Failed to fetch members:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchMembers()
  }, [])

  // Auto-refresh setiap 5 detik
  useEffect(() => {
    const interval = setInterval(fetchMembers, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleEdit = (member: TeamMember) => {
    setEditingId(member.id)
    setEditStatus(member.status)
    setEditTask(member.task)
  }

  const handleSave = async () => {
    if (!editingId || !editTask.trim()) return

    try {
      const res = await fetch(`/api/members/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: editStatus, task: editTask.trim() }),
      })

      if (res.ok) {
        const updated = await res.json()
        setMembers(members.map(m => m.id === editingId ? updated : m))
        setEditingId(null)
      }
    } catch (error) {
      console.error('Failed to save:', error)
    }
  }

  const selectedMember = members.find(m => m.id === selectedMemberId)

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2">
            📊 Papan Status Tim
          </h1>
          <p className="text-lg text-gray-700">
            Lihat semua orang dan status kerja mereka
          </p>
        </div>

        {/* Selector */}
        <div className="mb-8 bg-white rounded-lg p-6 shadow-sm">
          <label className="block text-2xl font-bold text-gray-900 mb-4">
            👤 Pilih nama Anda:
          </label>
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="w-full p-4 text-xl border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
          >
            <option value="">-- Pilih nama Anda --</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          {selectedMember && (
            <p className="mt-3 text-lg text-green-700 font-semibold">
              ✓ Terpilih: {selectedMember.name}
            </p>
          )}
        </div>

        {/* Refresh button */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={fetchMembers}
            className="px-6 py-3 text-xl font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            🔄 Perbarui Sekarang
          </button>
          <p className="text-sm text-gray-600 self-center">
            (Otomatis setiap 5 detik)
          </p>
        </div>

        {/* Members Grid */}
        {loading ? (
          <div className="text-center py-12 text-xl text-gray-600">
            ⏳ Memuat...
          </div>
        ) : (
          <div className="space-y-4">
            {members.map((member) => {
              const isEditing = editingId === member.id
              const statusColor = {
                belum_mulai: 'bg-red-100 border-red-300',
                dikerjakan: 'bg-yellow-100 border-yellow-300',
                selesai: 'bg-green-100 border-green-300',
              }[member.status]

              const statusLabel = {
                belum_mulai: '🔴 Belum Mulai',
                dikerjakan: '🟡 Dikerjakan',
                selesai: '✅ Selesai',
              }[member.status]

              const timeAgo = (() => {
                const diff = Date.now() - member.updatedAt
                const mins = Math.floor(diff / 60000)
                const hours = Math.floor(diff / 3600000)
                const days = Math.floor(diff / 86400000)

                if (mins < 1) return 'baru saja'
                if (mins < 60) return `${mins} menit lalu`
                if (hours < 24) return `${hours} jam lalu`
                return `${days} hari lalu`
              })()

              return (
                <div
                  key={member.id}
                  className={`p-6 rounded-lg border-2 ${statusColor} cursor-pointer hover:shadow-md transition ${
                    selectedMemberId === member.id ? 'ring-4 ring-blue-400' : ''
                  }`}
                  onClick={() => {
                    if (!isEditing && selectedMemberId === member.id) {
                      handleEdit(member)
                    }
                  }}
                >
                  {isEditing ? (
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {member.name}
                      </h3>

                      <div>
                        <label className="block text-lg font-semibold text-gray-900 mb-2">
                          Status:
                        </label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="w-full p-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        >
                          <option value="belum_mulai">🔴 Belum Mulai</option>
                          <option value="dikerjakan">🟡 Dikerjakan</option>
                          <option value="selesai">✅ Selesai</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-lg font-semibold text-gray-900 mb-2">
                          Apa yang dikerjakan:
                        </label>
                        <textarea
                          value={editTask}
                          onChange={(e) => setEditTask(e.target.value.slice(0, 60))}
                          maxLength={60}
                          placeholder="Contoh: Desain banner klien X"
                          className="w-full p-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                          rows={2}
                        />
                        <p className="text-sm text-gray-600 mt-1">
                          {editTask.length}/60 karakter
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={handleSave}
                          className="flex-1 px-6 py-3 text-lg font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          💾 Simpan
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex-1 px-6 py-3 text-lg font-bold bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
                        >
                          ✕ Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {member.name}
                      </h3>

                      <div className="mb-3">
                        <p className="text-xl font-semibold text-gray-900">
                          {statusLabel}
                        </p>
                      </div>

                      <div className="mb-3">
                        <p className="text-lg text-gray-800 font-medium">
                          {member.task || '(belum ada tugas)'}
                        </p>
                      </div>

                      <p className="text-sm text-gray-600">
                        diubah {timeAgo}
                      </p>

                      {selectedMemberId === member.id && (
                        <button
                          onClick={() => handleEdit(member)}
                          className="mt-4 w-full px-6 py-3 text-lg font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                          ✏️ Ubah Status Saya
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-600 pb-8">
          <p>Refresh otomatis setiap 5 detik. Tidak perlu login.</p>
        </div>
      </div>
    </main>
  )
}
