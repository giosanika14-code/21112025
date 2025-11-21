'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { UserRole } from '@/types'
import {
  Building2,
  Users,
  Briefcase,
  MessageSquare,
  ArrowRight,
  LogIn,
  Hotel,
  Shield,
} from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const { user, isAuthenticated, hydrated } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Only redirect if mounted and hydrated
    if (!mounted || !hydrated) return

    // If authenticated, redirect to appropriate portal
    if (isAuthenticated() && user?.role) {
      switch (user.role) {
        case UserRole.SUPER_ADMIN:
          router.push('/admin')
          break
        case UserRole.HOTEL_ADMIN:
          router.push('/hotel-admin')
          break
        case UserRole.STAFF:
          router.push('/staff')
          break
      }
    }
  }, [user, router, isAuthenticated, hydrated, mounted])

  // Show loading state until hydrated
  if (!mounted || !hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If authenticated, show loading while redirecting
  if (isAuthenticated()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to your portal...</p>
        </div>
      </div>
    )
  }

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-background to-accent-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Hotel className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Hospitality AI</h1>
                <p className="text-xs text-gray-600">SaaS Platform</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="btn-primary flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Login
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            AI-Powered Hotel Management
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Complete SaaS platform for 500+ hotels with Virtual AI Concierge and
            Real-time Task Management
          </p>
        </div>

        {/* Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {/* Super Admin Portal */}
          <div className="card hover:shadow-xl transition-all cursor-pointer group">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Super Admin
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Platform management, hotel creation, global monitoring
              </p>
              <button
                onClick={() => router.push('/login')}
                className="text-primary hover:text-primary-700 font-medium text-sm flex items-center justify-center gap-2 mx-auto"
              >
                Access Portal
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Hotel Admin Portal */}
          <div className="card hover:shadow-xl transition-all cursor-pointer group">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Building2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Hotel Admin
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Manage departments, rooms, staff, knowledge base, analytics
              </p>
              <button
                onClick={() => router.push('/login')}
                className="text-primary hover:text-primary-700 font-medium text-sm flex items-center justify-center gap-2 mx-auto"
              >
                Access Portal
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Staff Portal */}
          <div className="card hover:shadow-xl transition-all cursor-pointer group">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Briefcase className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Staff Portal
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Task management, mobile-first, real-time updates
              </p>
              <button
                onClick={() => router.push('/login')}
                className="text-primary hover:text-primary-700 font-medium text-sm flex items-center justify-center gap-2 mx-auto"
              >
                Access Portal
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Guest Chat */}
          <div className="card hover:shadow-xl transition-all cursor-pointer group">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                AI Concierge
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Guest chat, multilingual, QR code access
              </p>
              <button
                onClick={() => router.push('/chat')}
                className="text-primary hover:text-primary-700 font-medium text-sm flex items-center justify-center gap-2 mx-auto"
              >
                Try Demo
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="card max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Key Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  Multi-Tenant Architecture
                </h4>
                <p className="text-sm text-gray-600">
                  Supports 500+ hotels with complete data isolation
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  AI-Powered Chat
                </h4>
                <p className="text-sm text-gray-600">
                  Semantic analysis with multilingual support
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  Real-Time Tasks
                </h4>
                <p className="text-sm text-gray-600">
                  Instant Telegram notifications and WebSocket updates
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  Complete Management
                </h4>
                <p className="text-sm text-gray-600">
                  Departments, rooms, staff, analytics in one platform
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="max-w-2xl mx-auto mt-12">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-3">
              Demo Credentials
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-blue-700">Super Admin:</span>
                <code className="bg-white px-3 py-1 rounded text-blue-900">
                  admin@hospitalityai.com / Admin@123
                </code>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-3">
              ⚠️ Change default password immediately in production!
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-600">
          <p>&copy; 2024 Hospitality AI Platform. All rights reserved.</p>
          <p className="mt-2">Built for the hospitality industry 🏨</p>
        </div>
      </footer>
    </div>
  )
}
