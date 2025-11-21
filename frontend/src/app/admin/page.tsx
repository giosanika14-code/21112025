'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Hotel, UserRole } from '@/types'
import toast from 'react-hot-toast'
import {
  Plus,
  Edit,
  Trash2,
  Building2,
  Users,
  TrendingUp,
  CheckCircle,
  Star,
  LogOut,
} from 'lucide-react'

export default function AdminPage() {
  const router = useRouter()
  const { user, clearAuth, isAuthenticated } = useAuthStore()
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    license_expires_at: '',
    gm_first_name: '',
    gm_last_name: '',
    gm_email: '',
    gm_password: '',
  })

  useEffect(() => {
    if (!isAuthenticated() || user?.role !== UserRole.SUPER_ADMIN) {
      router.push('/login')
      return
    }

    fetchHotels()
    fetchStats()
  }, [])

  const fetchHotels = async () => {
    try {
      const response = await api.getHotels()
      if (response.success) {
        setHotels(response.data)
      }
    } catch (error) {
      toast.error('Failed to fetch hotels')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.getAdminStats()
      if (response.success) {
        setStats(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch stats')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = editingHotel
        ? await api.updateHotel(editingHotel.id, {
            name: formData.name,
            address: formData.address,
            phone: formData.phone,
            email: formData.email,
            license_expires_at: formData.license_expires_at || null,
          })
        : await api.createHotel(formData)

      if (response.success) {
        toast.success(editingHotel ? 'Hotel updated!' : 'Hotel created!')
        setShowModal(false)
        setEditingHotel(null)
        setFormData({
          name: '',
          address: '',
          phone: '',
          email: '',
          license_expires_at: '',
          gm_first_name: '',
          gm_last_name: '',
          gm_email: '',
          gm_password: '',
        })
        fetchHotels()
        fetchStats()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save hotel')
    }
  }

  const handleEdit = (hotel: Hotel) => {
    setEditingHotel(hotel)
    setFormData({
      name: hotel.name,
      address: hotel.address,
      phone: hotel.phone,
      email: hotel.email,
      license_expires_at: hotel.license_expires_at?.split('T')[0] || '',
      gm_first_name: '',
      gm_last_name: '',
      gm_email: '',
      gm_password: '',
    })
    setShowModal(true)
  }

  const handleDelete = async (hotelId: string) => {
    if (!confirm('Are you sure? This will deactivate the hotel and all its users.'))
      return

    try {
      const response = await api.deleteHotel(hotelId)
      if (response.success) {
        toast.success('Hotel deactivated!')
        fetchHotels()
        fetchStats()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete hotel')
    }
  }

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Super Admin Panel</h1>
              <p className="text-gray-600 mt-1">Platform Management</p>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.active_hotels}
                  </p>
                  <p className="text-sm text-gray-600">Active Hotels</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.active_users}
                  </p>
                  <p className="text-sm text-gray-600">Active Users</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.tasks_last_30_days}
                  </p>
                  <p className="text-sm text-gray-600">Tasks (30d)</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.avg_rating_last_30_days
                      ? parseFloat(stats.avg_rating_last_30_days).toFixed(1)
                      : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">Avg Rating</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hotels */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Hotels</h2>
            <button
              onClick={() => {
                setEditingHotel(null)
                setFormData({
                  name: '',
                  address: '',
                  phone: '',
                  email: '',
                  license_expires_at: '',
                  gm_first_name: '',
                  gm_last_name: '',
                  gm_email: '',
                  gm_password: '',
                })
                setShowModal(true)
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Hotel
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Hotel
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Contact
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Users
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Rooms
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {hotels.map((hotel) => (
                    <tr
                      key={hotel.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-gray-900">{hotel.name}</div>
                          <div className="text-sm text-gray-600">{hotel.address}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="text-gray-900">{hotel.email}</div>
                        <div className="text-gray-600">{hotel.phone}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {hotel.user_count || 0}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {hotel.room_count || 0}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            hotel.license_status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {hotel.license_status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(hotel)}
                            className="text-primary hover:text-primary-700"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(hotel.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full my-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingHotel ? 'Edit Hotel' : 'Add New Hotel'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hotel Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="input"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address *
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="input"
                      required
                      disabled={!!editingHotel}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      License Expires
                    </label>
                    <input
                      type="date"
                      value={formData.license_expires_at}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          license_expires_at: e.target.value,
                        })
                      }
                      className="input"
                    />
                  </div>

                  {!editingHotel && (
                    <>
                      <div className="md:col-span-2">
                        <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">
                          General Manager Account
                        </h3>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name *
                        </label>
                        <input
                          type="text"
                          value={formData.gm_first_name}
                          onChange={(e) =>
                            setFormData({ ...formData, gm_first_name: e.target.value })
                          }
                          className="input"
                          required={!editingHotel}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          value={formData.gm_last_name}
                          onChange={(e) =>
                            setFormData({ ...formData, gm_last_name: e.target.value })
                          }
                          className="input"
                          required={!editingHotel}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={formData.gm_email}
                          onChange={(e) =>
                            setFormData({ ...formData, gm_email: e.target.value })
                          }
                          className="input"
                          required={!editingHotel}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Password *
                        </label>
                        <input
                          type="password"
                          value={formData.gm_password}
                          onChange={(e) =>
                            setFormData({ ...formData, gm_password: e.target.value })
                          }
                          className="input"
                          required={!editingHotel}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button type="submit" className="btn-primary flex-1">
                    {editingHotel ? 'Update Hotel' : 'Create Hotel & GM Account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingHotel(null)
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
