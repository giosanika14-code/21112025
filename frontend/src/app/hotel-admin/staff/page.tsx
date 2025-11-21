'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Staff, Department } from '@/types'
import HotelAdminLayout from '@/components/hotel-admin/Layout'
import toast from 'react-hot-toast'
import { Plus, Edit, UserCheck, UserX } from 'lucide-react'

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    department_id: '',
  })

  useEffect(() => {
    fetchStaff()
    fetchDepartments()
  }, [])

  const fetchStaff = async () => {
    try {
      const response = await api.getStaff()
      if (response.success) {
        setStaff(response.data)
      }
    } catch (error) {
      toast.error('Failed to fetch staff')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await api.getDepartments()
      if (response.success) {
        setDepartments(response.data.filter((d: Department) => d.is_active))
      }
    } catch (error) {
      console.error('Failed to fetch departments')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = editingStaff
        ? await api.updateStaff(editingStaff.id, {
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: formData.phone,
            department_id: formData.department_id,
          })
        : await api.createStaff(formData)

      if (response.success) {
        toast.success(editingStaff ? 'Staff updated!' : 'Staff member created!')
        setShowModal(false)
        setEditingStaff(null)
        setFormData({
          email: '',
          password: '',
          first_name: '',
          last_name: '',
          phone: '',
          department_id: '',
        })
        fetchStaff()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save staff member')
    }
  }

  const handleEdit = (member: Staff) => {
    setEditingStaff(member)
    setFormData({
      email: member.email,
      password: '',
      first_name: member.first_name,
      last_name: member.last_name,
      phone: member.phone || '',
      department_id: member.department_id,
    })
    setShowModal(true)
  }

  return (
    <HotelAdminLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Staff</h1>
            <p className="text-gray-600 mt-1">Manage hotel staff members</p>
          </div>
          <button
            onClick={() => {
              setEditingStaff(null)
              setFormData({
                email: '',
                password: '',
                first_name: '',
                last_name: '',
                phone: '',
                department_id: '',
              })
              setShowModal(true)
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Staff
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Phone</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Department</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">
                        {member.first_name} {member.last_name}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{member.email}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {member.phone || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {member.department_name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {member.is_active ? (
                        <span className="flex items-center gap-1 text-green-600 text-sm">
                          <UserCheck className="w-4 h-4" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-400 text-sm">
                          <UserX className="w-4 h-4" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleEdit(member)}
                        className="text-primary hover:text-primary-700"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) =>
                        setFormData({ ...formData, first_name: e.target.value })
                      }
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) =>
                        setFormData({ ...formData, last_name: e.target.value })
                      }
                      className="input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email * {editingStaff && '(cannot be changed)'}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="input"
                    required
                    disabled={!!editingStaff}
                  />
                </div>

                {!editingStaff && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="input"
                      required={!editingStaff}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department *
                  </label>
                  <select
                    value={formData.department_id}
                    onChange={(e) =>
                      setFormData({ ...formData, department_id: e.target.value })
                    }
                    className="input"
                    required
                  >
                    <option value="">Select department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button type="submit" className="btn-primary flex-1">
                    {editingStaff ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingStaff(null)
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
