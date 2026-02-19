'use client'

import { useState } from 'react'
import { LocationDetector } from '@/components/LocationDetector'
import { createRoom, joinRoom } from './actions'
import { createClient } from '@/utils/supabase/client'

export default function Home() {
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [username, setUsername] = useState('')

  const [joinCode, setJoinCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const handleCreateRoom = async () => {
    setIsCreating(true)
    const supabase = createClient()

    // Ensure user is signed in (anonymously)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      const { error } = await supabase.auth.signInAnonymously()
      if (error) {
        alert('Failed to sign in: ' + error.message)
        setIsCreating(false)
        return
      }
    }

    // Also update profile if username provided (optional logic for now)
    // await updateProfile(username) 

    try {
      const result = await createRoom(location, username)
      if (result?.error) {
        console.error('Create Room Error:', result.error)
        alert('Failed to create room: ' + result.error)
      }
    } catch (e: any) {
      console.error('Unexpected error creating room:', e)
      alert('An unexpected error occurred: ' + e.message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoin = async () => {
    if (!joinCode) return
    setIsJoining(true)
    const supabase = createClient()

    // Ensure auth
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      await supabase.auth.signInAnonymously()
    }

    // Call server action
    const result = await joinRoom(joinCode, username)
    if (result?.error) {
      alert(result.error)
      setIsJoining(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-900 text-white">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600 mb-2">
            MakanMatch
          </h1>
          <p className="text-slate-400">"Anything also can" resolved.</p>
        </div>

        <div className="bg-slate-800 p-8 rounded-2xl shadow-xl space-y-6 border border-slate-700">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center">Create a Room</h2>

            <div className="flex flex-col gap-3">
              <label className="text-sm text-slate-400">Your Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                className="bg-slate-900 border border-slate-700 rounded-lg p-3 w-full focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2 items-center pt-2">
              <LocationDetector onLocationDetected={setLocation} />
              {location && <span className="text-xs text-green-400">Location set!</span>}
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={isCreating || !username} // Enforce username
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {isCreating ? 'Creating...' : 'Start Session'}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800 text-slate-400">Or join existing</span>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="4-digit Code"
              className="bg-slate-900 border border-slate-700 rounded-lg p-3 w-full text-center tracking-widest font-mono uppercase"
              maxLength={4}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
            <button
              onClick={handleJoin}
              disabled={isJoining || !joinCode}
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isJoining ? '...' : 'Join'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
