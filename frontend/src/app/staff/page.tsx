'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Task, TaskStatus, UserRole } from '@/types'
import toast from 'react-hot-toast'
import {
  CheckCircle,
  Clock,
  AlertCircle,
  PlayCircle,
  LogOut,
  Filter,
  TrendingUp,
} from 'lucide-react'

export default function StaffPortalPage() {
  const router = useRouter()
  const { user, clearAuth, isAuthenticated } = useAuthStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    if (!isAuthenticated() || user?.role !== UserRole.STAFF) {
      router.push('/login')
      return
    }

    fetchTasks()
    fetchStats()

    // Refresh tasks every 30 seconds
    const interval = setInterval(fetchTasks, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedStatus === 'all') {
      setFilteredTasks(tasks)
    } else {
      setFilteredTasks(tasks.filter((task) => task.status === selectedStatus))
    }
  }, [selectedStatus, tasks])

  const fetchTasks = async () => {
    try {
      const response = await api.getTasks()
      if (response.success) {
        setTasks(response.data)
        setFilteredTasks(response.data)
      }
    } catch (error: any) {
      toast.error('Failed to fetch tasks')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.getStaffStats()
      if (response.success) {
        setStats(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch stats')
    }
  }

  const handleAcceptTask = async (taskId: string) => {
    try {
      const response = await api.acceptTask(taskId)
      if (response.success) {
        toast.success('Task accepted!')
        fetchTasks()
        fetchStats()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to accept task')
    }
  }

  const handleStartTask = async (taskId: string) => {
    try {
      const response = await api.startTask(taskId)
      if (response.success) {
        toast.success('Task started!')
        fetchTasks()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start task')
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      const response = await api.completeTask(taskId)
      if (response.success) {
        toast.success('Task completed! 🎉')
        fetchTasks()
        fetchStats()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to complete task')
    }
  }

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.NEW:
        return 'bg-blue-500'
      case TaskStatus.ACCEPTED:
        return 'bg-yellow-500'
      case TaskStatus.IN_PROGRESS:
        return 'bg-purple-500'
      case TaskStatus.COMPLETED:
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getTaskCounts = () => {
    return {
      all: tasks.length,
      new: tasks.filter((t) => t.status === TaskStatus.NEW).length,
      accepted: tasks.filter((t) => t.status === TaskStatus.ACCEPTED).length,
      in_progress: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
      completed: tasks.filter((t) => t.status === TaskStatus.COMPLETED).length,
    }
  }

  const counts = getTaskCounts()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Staff Portal</h1>
              <p className="text-sm text-gray-600">
                {user?.first_name} {user?.last_name}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-blue-600 font-medium">Total Tasks</p>
                <p className="text-2xl font-bold text-blue-900">
                  {stats.total_tasks || 0}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <p className="text-xs text-green-600 font-medium">Completed</p>
                <p className="text-2xl font-bold text-green-900">
                  {stats.completed_tasks || 0}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <p className="text-xs text-purple-600 font-medium">In Progress</p>
                <p className="text-2xl font-bold text-purple-900">
                  {stats.in_progress_tasks || 0}
                </p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <p className="text-xs text-yellow-600 font-medium">Avg Rating</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {stats.avg_rating ? parseFloat(stats.avg_rating).toFixed(1) : 'N/A'}
                </p>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
            {[
              { key: 'all', label: 'All', count: counts.all },
              { key: 'new', label: 'New', count: counts.new },
              { key: 'accepted', label: 'Accepted', count: counts.accepted },
              { key: 'in_progress', label: 'In Progress', count: counts.in_progress },
              { key: 'completed', label: 'Completed', count: counts.completed },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setSelectedStatus(filter.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedStatus === filter.key
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="card text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No tasks found</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div key={task.id} className="card hover:shadow-md transition-shadow">
                {/* Task Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`w-3 h-3 rounded-full ${getStatusColor(
                          task.status
                        )}`}
                      ></span>
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {task.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Room {task.room_number}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getPriorityColor(
                      task.priority
                    )}`}
                  >
                    {task.priority.toUpperCase()}
                  </span>
                </div>

                {/* Task Content */}
                <p className="text-gray-700 mb-4 text-sm sm:text-base">
                  {task.description || task.original_message}
                </p>

                {/* Task Meta */}
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(task.created_at).toLocaleString()}
                  </span>
                  {task.assigned_to_name && (
                    <span>Assigned to: {task.assigned_to_name}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {task.status === TaskStatus.NEW && (
                    <button
                      onClick={() => handleAcceptTask(task.id)}
                      className="btn-primary flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Accept Task
                    </button>
                  )}

                  {task.status === TaskStatus.ACCEPTED && (
                    <button
                      onClick={() => handleStartTask(task.id)}
                      className="btn-accent flex items-center gap-2"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Start Task
                    </button>
                  )}

                  {task.status === TaskStatus.IN_PROGRESS && (
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      className="bg-green-600 text-white hover:bg-green-700 btn flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark Complete
                    </button>
                  )}

                  {task.status === TaskStatus.COMPLETED && (
                    <span className="text-green-600 font-medium flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Completed
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
