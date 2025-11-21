'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { KnowledgeBase } from '@/types'
import HotelAdminLayout from '@/components/hotel-admin/Layout'
import toast from 'react-hot-toast'
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react'

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<KnowledgeBase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<KnowledgeBase | null>(null)
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    content: '',
    language: 'en',
    tags: '',
  })

  useEffect(() => {
    fetchEntries()
  }, [])

  const fetchEntries = async () => {
    try {
      const response = await api.getKnowledgeBase()
      if (response.success) {
        setEntries(response.data)
      }
    } catch (error) {
      toast.error('Failed to fetch knowledge base')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const data = {
        ...formData,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      }

      const response = editingEntry
        ? await api.updateKnowledgeBase(editingEntry.id, data)
        : await api.createKnowledgeBase(data)

      if (response.success) {
        toast.success(editingEntry ? 'Entry updated!' : 'Entry created!')
        setShowModal(false)
        setEditingEntry(null)
        setFormData({ category: '', title: '', content: '', language: 'en', tags: '' })
        fetchEntries()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save entry')
    }
  }

  const handleEdit = (entry: KnowledgeBase) => {
    setEditingEntry(entry)
    setFormData({
      category: entry.category,
      title: entry.title,
      content: entry.content,
      language: entry.language,
      tags: entry.tags.join(', '),
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return

    try {
      const response = await api.deleteKnowledgeBase(id)
      if (response.success) {
        toast.success('Entry deleted!')
        fetchEntries()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete entry')
    }
  }

  const groupedEntries = entries.reduce((acc, entry) => {
    if (!acc[entry.category]) acc[entry.category] = []
    acc[entry.category].push(entry)
    return acc
  }, {} as Record<string, KnowledgeBase[]>)

  return (
    <HotelAdminLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Knowledge Base</h1>
            <p className="text-gray-600 mt-1">Provide context for the AI Concierge</p>
          </div>
          <button
            onClick={() => {
              setEditingEntry(null)
              setFormData({ category: '', title: '', content: '', language: 'en', tags: '' })
              setShowModal(true)
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Entry
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : Object.keys(groupedEntries).length === 0 ? (
          <div className="card text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No knowledge base entries yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedEntries).map(([category, categoryEntries]) => (
              <div key={category}>
                <h2 className="text-xl font-bold text-gray-900 mb-4 capitalize">
                  {category}
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {categoryEntries.map((entry) => (
                    <div key={entry.id} className="card">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {entry.title}
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(entry)}
                            className="text-primary hover:text-primary-700"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{entry.content}</p>
                      {entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {entry.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full my-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingEntry ? 'Edit Entry' : 'Add Entry'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="input"
                      placeholder="e.g., Amenities, Dining, Policies"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Language
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) =>
                        setFormData({ ...formData, language: e.target.value })
                      }
                      className="input"
                    >
                      <option value="en">English</option>
                      <option value="ka">Georgian</option>
                      <option value="ru">Russian</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    className="input min-h-[150px]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData({ ...formData, tags: e.target.value })
                    }
                    className="input"
                    placeholder="pool, spa, breakfast"
                  />
                </div>

                <div className="flex gap-3">
                  <button type="submit" className="btn-primary flex-1">
                    {editingEntry ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingEntry(null)
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
