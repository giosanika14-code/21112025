'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Message, ChatSession } from '@/types'
import toast from 'react-hot-toast'
import { Send, Star, X, QrCode } from 'lucide-react'

function ChatContent() {
  const searchParams = useSearchParams()
  const qrCode = searchParams.get('qr')

  const [session, setSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [ratingTaskId, setRatingTaskId] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [demoMode, setDemoMode] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!qrCode) {
      // Demo mode - no QR code provided
      setDemoMode(true)
      setIsLoading(false)
      setMessages([
        {
          id: '1',
          sender_type: 'ai',
          content: 'Welcome to Hospitality AI Demo! To access the full chat, please scan a room QR code. This is a demo version where you can try the interface.',
          task_id: null,
          created_at: new Date().toISOString(),
        },
      ])
      return
    }

    initChat()
  }, [qrCode])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const initChat = async () => {
    try {
      setIsLoading(true)
      const response = await api.initChat(qrCode!)

      if (response.success) {
        setSession(response.data)
        setMessages([
          {
            id: '1',
            sender_type: 'ai',
            content: response.data.welcome_message,
            task_id: null,
            created_at: new Date().toISOString(),
          },
        ])
      } else {
        toast.error(response.error || 'Failed to initialize chat')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start chat session')
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputMessage.trim() || isSending) return

    // Demo mode - simulated responses
    if (demoMode) {
      const messageText = inputMessage.trim()
      setInputMessage('')

      const guestMessage: Message = {
        id: Date.now().toString(),
        sender_type: 'guest',
        content: messageText,
        task_id: null,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, guestMessage])

      // Simulated AI response
      setTimeout(() => {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender_type: 'ai',
          content: 'This is a demo response. In the full version, I would analyze your request and create tasks for the appropriate department. Please scan a room QR code to access the full functionality.',
          task_id: null,
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, aiMessage])
      }, 1000)

      return
    }

    if (!session) {
      toast.error('No active session')
      return
    }

    const messageText = inputMessage.trim()
    setInputMessage('')
    setIsSending(true)

    // Add guest message immediately
    const guestMessage: Message = {
      id: Date.now().toString(),
      sender_type: 'guest',
      content: messageText,
      task_id: null,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, guestMessage])

    try {
      const response = await api.sendMessage(session.session_token, messageText)

      if (response.success) {
        // Add AI response
        const aiMessage: Message = {
          id: response.data.message_id,
          sender_type: 'ai',
          content: response.data.content,
          task_id: response.data.task_id,
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, aiMessage])

        // If task was created, show rating option when completed
        if (response.data.task_created) {
          toast.success('Your request has been forwarded to our team!')
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send message')
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  const submitRating = async () => {
    if (!session || !ratingTaskId || rating === 0) {
      toast.error('Please select a rating')
      return
    }

    try {
      const response = await api.rateTask(
        session.session_token,
        ratingTaskId,
        rating,
        ratingComment
      )

      if (response.success) {
        toast.success('Thank you for your feedback!')
        setShowRating(false)
        setRatingTaskId(null)
        setRating(0)
        setRatingComment('')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit rating')
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-accent-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {session ? session.hotel_name : 'Hospitality AI'}
              </h1>
              <p className="text-sm text-gray-600">
                {session ? `Room ${session.room_number} • ` : ''}AI Concierge
                {demoMode && ' (Demo Mode)'}
              </p>
            </div>
            {demoMode && (
              <div className="flex items-center gap-2 text-yellow-600 text-sm">
                <QrCode className="w-5 h-5" />
                <span className="hidden sm:inline">Scan QR for full access</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender_type === 'guest' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 ${
                  message.sender_type === 'guest'
                    ? 'bg-primary text-white'
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}
              >
                <p className="text-sm sm:text-base whitespace-pre-wrap">
                  {message.content}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <p
                    className={`text-xs ${
                      message.sender_type === 'guest'
                        ? 'text-primary-100'
                        : 'text-gray-500'
                    }`}
                  >
                    {formatTime(message.created_at)}
                  </p>
                  {message.task_id && message.sender_type === 'ai' && !demoMode && (
                    <button
                      onClick={() => {
                        setRatingTaskId(message.task_id)
                        setShowRating(true)
                      }}
                      className="text-xs text-accent-600 hover:text-accent-700 font-medium ml-3"
                    >
                      Rate Service
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <form
          onSubmit={sendMessage}
          className="max-w-4xl mx-auto flex items-end gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={demoMode ? 'Try demo chat...' : 'Type your message...'}
            className="flex-1 input"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isSending}
            className="btn-primary px-4 py-2.5 flex items-center gap-2"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Rating Modal */}
      {showRating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Rate Your Experience
              </h3>
              <button
                onClick={() => {
                  setShowRating(false)
                  setRating(0)
                  setRatingComment('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              How satisfied are you with our service?
            </p>

            {/* Star Rating */}
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Comment */}
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Additional comments (optional)"
              className="input min-h-[100px] resize-none mb-4"
              rows={3}
            />

            {/* Submit */}
            <button
              onClick={submitRating}
              disabled={rating === 0}
              className="btn-primary w-full"
            >
              Submit Rating
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  )
}
