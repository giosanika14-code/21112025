'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Department } from '@/types'
import HotelAdminLayout from '@/components/hotel-admin/Layout'
import toast from 'react-hot-toast'
import { Plus, Edit, Send } from 'lucide-react'

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'housekeeping',
    telegram_group_id: '',
    description: '',
  })

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      const response = await api.getDepartments()
      if (response.success) {
        setDepartments(response.data)
      }
    } catch (error) {
      toast.error('Failed to fetch departments')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = editingDept
        ? await api.updateDepartment(editingDept.id, formData)
        : await api.createDepartment(formData)

      if (response.success) {
        toast.success(
          editingDept ? 'Department updated!' : 'Department created!'
        )
        setShowModal(false)
        setEditingDept(null)
        setFormData({ name: '', type: 'housekeeping', telegram_group_id: '', description: '' })
        fetchDepartments()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save department')
    }
  }

  const handleEdit = (dept: Department) => {
    setEditingDept(dept)
    setFormData({
      name: dept.name,
      type: dept.type,
      telegram_group_id: dept.telegram_group_id || '',
      description: dept.description || '',
    })
    setShowModal(true)
  }

  const testTelegram = async (deptId: string) => {
    try {
      const response = await api.testTelegramConnection(deptId)
      if (response.success) {
        toast.success('Telegram connection successful!')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Connection failed')
    }
  }

  return (
    <HotelAdminLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
            <p className="text-gray-600 mt-1">Manage hotel departments and Telegram integration</p>
          </div>
          <button
            onClick={() => {
              setEditingDept(null)
              setFormData({ name: '', type: 'housekeeping', telegram_group_id: '', description: '' })
              setShowModal(true)
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Department
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept) => (
              <div key={dept.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{dept.name}</h3>
                    <p className="text-sm text-gray-600 capitalize">{dept.type.replace('_', ' ')}</p>
                  </div>
                  <button
                    onClick={() => handleEdit(dept)}
                    className="text-primary hover:text-primary-700"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                </div>

                {dept.description && (
                  <p className="text-sm text-gray-600 mb-4">{dept.description}</p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Staff:</span>
                    <span className="font-medium">{dept.staff_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tasks:</span>
                    <span className="font-medium">{dept.task_count || 0}</span>
                  </div>
                </div>

                {dept.telegram_group_id && (
                  <button
                    onClick={() => testTelegram(dept.id)}
                    className="btn-secondary w-full mt-4 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Test Telegram
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingDept ? 'Edit Department' : 'Add Department'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input"
                  >
                    <option value="housekeeping">Housekeeping</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="front_desk">Front Desk</option>
                    <option value="concierge">Concierge</option>
                    <option value="room_service">Room Service</option>
                    <option value="it">IT</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telegram Group ID
                  </label>
                  <input
                    type="text"
                    value={formData.telegram_group_id}
                    onChange={(e) =>
                      setFormData({ ...formData, telegram_group_id: e.target.value })
                    }
                    className="input"
                    placeholder="-1001234567890"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Add bot to group and get ID from bot updates
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="input"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3">
                  <button type="submit" className="btn-primary flex-1">
                    {editingDept ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingDept(null)
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
    </HotelAdminLayout>
  )
}
