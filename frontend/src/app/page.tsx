'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { UserRole } from '@/types'

export default function Home() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    // Redirect based on user role
    switch (user?.role) {
      case UserRole.SUPER_ADMIN:
        router.push('/admin')
        break
      case UserRole.HOTEL_ADMIN:
        router.push('/hotel-admin')
        break
      case UserRole.STAFF:
        router.push('/staff')
        break
      default:
        router.push('/login')
    }
  }, [user, router, isAuthenticated])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}
