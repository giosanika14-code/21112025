'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Room } from '@/types'
import HotelAdminLayout from '@/components/hotel-admin/Layout'
import toast from 'react-hot-toast'
import { Plus, Edit, QrCode, RefreshCw, Download } from 'lucide-react'

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [formData, setFormData] = useState({
    room_number: '',
    floor: '',
    room_type: '',
  })

  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    try {
      const response = await api.getRooms()
      if (response.success) {
        setRooms(response.data)
      }
    } catch (error) {
      toast.error('Failed to fetch rooms')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const roomData = {
        ...formData,
        floor: formData.floor ? parseInt(formData.floor) : null,
      }

      const response = editingRoom
        ? await api.updateRoom(editingRoom.id, roomData)
        : await api.createRoom(roomData)

      if (response.success) {
        toast.success(editingRoom ? 'Room updated!' : 'Room created!')
        setShowModal(false)
        setEditingRoom(null)
        setFormData({ room_number: '', floor: '', room_type: '' })
        fetchRooms()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save room')
    }
  }

  const handleEdit = (room: Room) => {
    setEditingRoom(room)
    setFormData({
      room_number: room.room_number,
      floor: room.floor ? room.floor.toString() : '',
      room_type: room.room_type || '',
    })
    setShowModal(true)
  }

  const showQR = (room: Room) => {
    setSelectedRoom(room)
    setShowQRModal(true)
  }

  const regenerateQR = async (roomId: string) => {
    try {
      const response = await api.regenerateQRCode(roomId)
      if (response.success) {
        toast.success('QR code regenerated!')
        fetchRooms()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to regenerate QR code')
    }
  }

  const downloadQR = (room: Room) => {
    if (!room.qr_code_url) return

    const link = document.createElement('a')
    link.href = room.qr_code_url
    link.download = `room-${room.room_number}-qr.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <HotelAdminLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rooms</h1>
            <p className="text-gray-600 mt-1">Manage rooms and QR codes</p>
          </div>
          <button
            onClick={() => {
              setEditingRoom(null)
              setFormData({ room_number: '', floor: '', room_type: '' })
              setShowModal(true)
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Room
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rooms.map((room) => (
              <div key={room.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {room.room_number}
                    </h3>
                    {room.room_type && (
                      <p className="text-sm text-gray-600">{room.room_type}</p>
                    )}
                    {room.floor && (
                      <p className="text-xs text-gray-500">Floor {room.floor}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleEdit(room)}
                    className="text-primary hover:text-primary-700"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => showQR(room)}
                    className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    View QR
                  </button>
                  <button
                    onClick={() => regenerateQR(room.id)}
                    className="btn-secondary text-sm p-2"
                    title="Regenerate QR"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingRoom ? 'Edit Room' : 'Add Room'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room Number *
                  </label>
                  <input
                    type="text"
                    value={formData.room_number}
                    onChange={(e) =>
                      setFormData({ ...formData, room_number: e.target.value })
                    }
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Floor
                  </label>
                  <input
                    type="number"
                    value={formData.floor}
                    onChange={(e) =>
                      setFormData({ ...formData, floor: e.target.value })
                    }
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room Type
                  </label>
                  <input
                    type="text"
                    value={formData.room_type}
                    onChange={(e) =>
                      setFormData({ ...formData, room_type: e.target.value })
                    }
                    className="input"
                    placeholder="e.g., Deluxe, Suite, Standard"
                  />
                </div>

                <div className="flex gap-3">
                  <button type="submit" className="btn-primary flex-1">
                    {editingRoom ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingRoom(null)
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

        {/* QR Code Modal */}
        {showQRModal && selectedRoom && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Room {selectedRoom.room_number}
              </h2>
              <p className="text-gray-600 mb-6">Scan to start chat</p>

              {selectedRoom.qr_code_url && (
                <div className="mb-6">
                  <img
                    src={selectedRoom.qr_code_url}
                    alt={`QR Code for Room ${selectedRoom.room_number}`}
                    className="mx-auto rounded-lg shadow-lg"
                    style={{ width: '300px', height: '300px' }}
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => downloadQR(selectedRoom)}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download
                </button>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="btn-secondary flex-1"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </HotelAdminLayout>
  )
}
