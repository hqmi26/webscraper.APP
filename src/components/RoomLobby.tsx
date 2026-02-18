'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

// Define types locally or in a types file
type Participant = {
    id: string
    user_id: string
    joined_at: string
}

export function RoomLobby({ roomCode, initialParticipants, roomId }: { roomCode: string, initialParticipants: any[], roomId: string }) {
    const [participants, setParticipants] = useState<Participant[]>(initialParticipants)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        const channel = supabase
            .channel('room_participants')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'participants',
                filter: `room_id=eq.${roomId}`
            }, async (payload) => {
                console.log('Change received!', payload)
                router.refresh() // Refresh server components

                // Also fetch latest participants to update local state immediately
                const { data } = await supabase.from('participants').select('*').eq('room_id', roomId)
                if (data) {
                    setParticipants(data)
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [roomId, supabase, router])

    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-md shadow-2xl">
            <div className="flex flex-col items-center mb-6">
                <span className="text-slate-400 text-sm uppercase tracking-widest mb-1">Room Code</span>
                <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600 tracking-widest">
                    {roomCode}
                </h2>
            </div>

            <div className="space-y-3 mb-6">
                <h3 className="text-slate-300 font-medium">Participants ({participants.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {participants.map((p) => (
                        <div key={p.id} className="bg-slate-700/50 p-3 rounded-lg flex items-center gap-3 border border-slate-600/50">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                                {p.user_id.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-slate-200 font-mono text-sm">{p.user_id.slice(0, 8)}...</span>
                        </div>
                    ))}
                    {participants.length === 0 && <p className="text-slate-500 text-sm">No confirmed participants yet.</p>}
                </div>
            </div>

            <div className="mt-6 text-center space-y-3">
                <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-900/20">
                    Start Voting
                </button>
                <p className="text-slate-500 text-xs animate-pulse">
                    Waiting for host to start...
                </p>
            </div>
        </div>
    )
}
