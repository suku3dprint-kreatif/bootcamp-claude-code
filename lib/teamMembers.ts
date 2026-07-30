// Daftar anggota tim — EDIT DI SINI untuk menambah/mengubah nama anggota
export const TEAM_MEMBERS = [
  'Budi Hartono',
  'Siti Nurhaliza',
  'Ahmad Wijaya',
  'Dwi Putra Sanca',
  'Eka Saputra',
  'Lina Kusuma',
  'Rizki Pratama',
  'Maya Santoso',
]

export type TeamMember = {
  id: string
  name: string
  status: 'belum_mulai' | 'dikerjakan' | 'selesai'
  task: string
  updatedAt: number
}
