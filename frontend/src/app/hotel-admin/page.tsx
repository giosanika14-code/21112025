'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { api } from '@/lib/api'
import { UserRole, AnalyticsOverview } from '@/types'
import HotelAdminLayout from '@/components/hotel-admin/Layout'
import {
  TrendingUp,
  CheckCircle,
  Clock,
  Star,
  Users,
  Home,
  Activity,
} from 'lucide-react'

export default function HotelAdminDashboard() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated() || user?.role !== UserRole.HOTEL_ADMIN) {
      router.push('/login')
      return
    }

    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await api.getAnalyticsOverview()
      if (response.success) {
        setAnalytics(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <HotelAdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </HotelAdminLayout>
    )
  }

  const completionRate = analytics
    ? ((analytics.completed_tasks / analytics.tasks_last_30_days) * 100).toFixed(1)
    : '0'

  return (
    <HotelAdminLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">
            Welcome back, {user?.first_name}! Here's your hotel overview.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">Last 30 Days</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {analytics?.tasks_last_30_days || 0}
            </p>
            <p className="text-sm text-gray-600">Total Tasks</p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm text-green-600 font-medium">
                {completionRate}%
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {analytics?.completed_tasks || 0}
            </p>
            <p className="text-sm text-gray-600">Completed Tasks</p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <span className="text-sm text-gray-500">Avg Time</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {analytics?.avg_completion_time_minutes
                ? Math.round(analytics.avg_completion_time_minutes)
                : 'N/A'}
            </p>
            <p className="text-sm text-gray-600">Minutes</p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-sm text-purple-600 font-medium">Rating</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {analytics?.avg_rating
                ? parseFloat(analytics.avg_rating).toFixed(1)
                : 'N/A'}
            </p>
            <p className="text-sm text-gray-600">Guest Satisfaction</p>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <Clock className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.pending_tasks || 0}
                </p>
                <p className="text-sm text-gray-600">Pending Tasks</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-100 rounded-lg">
                <Home className="w-6 h-6 text-cyan-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.active_rooms || 0}
                </p>
                <p className="text-sm text-gray-600">Active Rooms</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.active_staff || 0}
                </p>
                <p className="text-sm text-gray-600">Active Staff</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/hotel-admin/departments')}
              className="btn-primary text-left justify-start"
            >
              Manage Departments
            </button>
            <button
              onClick={() => router.push('/hotel-admin/rooms')}
              className="btn-primary text-left justify-start"
            >
              Manage Rooms & QR Codes
            </button>
            <button
              onClick={() => router.push('/hotel-admin/knowledge-base')}
              className="btn-primary text-left justify-start"
            >
              Update Knowledge Base
            </button>
            <button
              onClick={() => router.push('/hotel-admin/staff')}
              className="btn-secondary text-left justify-start"
            >
              Manage Staff
            </button>
            <button
              onClick={() => router.push('/hotel-admin/analytics')}
              className="btn-secondary text-left justify-start"
            >
              View Analytics
            </button>
          </div>
        </div>
      </div>
    </HotelAdminLayout>
  )
}
