'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { DepartmentAnalytics } from '@/types'
import HotelAdminLayout from '@/components/hotel-admin/Layout'
import { TrendingUp, Clock, Star, CheckCircle } from 'lucide-react'

export default function AnalyticsPage() {
  const [deptAnalytics, setDeptAnalytics] = useState<DepartmentAnalytics[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await api.getDepartmentAnalytics()
      if (response.success) {
        setDeptAnalytics(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <HotelAdminLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Department performance overview (Last 30 days)</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {deptAnalytics.map((dept) => {
              const completionRate = dept.total_tasks > 0
                ? ((dept.completed_tasks / dept.total_tasks) * 100).toFixed(1)
                : '0'

              return (
                <div key={dept.id} className="card">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{dept.name}</h3>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        <span className="text-sm text-blue-600 font-medium">Total Tasks</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-900">{dept.total_tasks}</p>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-green-600 font-medium">Completed</span>
                      </div>
                      <p className="text-2xl font-bold text-green-900">
                        {dept.completed_tasks}
                      </p>
                      <p className="text-xs text-green-600 mt-1">{completionRate}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-yellow-600" />
                        <span className="text-sm text-yellow-600 font-medium">Avg Time</span>
                      </div>
                      <p className="text-2xl font-bold text-yellow-900">
                        {dept.avg_completion_time
                          ? Math.round(dept.avg_completion_time)
                          : 'N/A'}
                      </p>
                      {dept.avg_completion_time && (
                        <p className="text-xs text-yellow-600 mt-1">minutes</p>
                      )}
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-5 h-5 text-purple-600" />
                        <span className="text-sm text-purple-600 font-medium">Rating</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-900">
                        {dept.avg_rating
                          ? parseFloat(dept.avg_rating).toFixed(1)
                          : 'N/A'}
                      </p>
                      {dept.avg_rating && (
                        <p className="text-xs text-purple-600 mt-1">out of 5</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </HotelAdminLayout>
  )
}
