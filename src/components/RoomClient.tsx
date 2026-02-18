'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { VotingDeck } from '@/components/VotingDeck'
import { WinnerReveal } from '@/components/WinnerReveal'

type Participant = {
    id: string
    user_id: string
    joined_at: string
}

type Candidate = {
    id: string
    displayName: { text: string }
    formattedAddress: string
    location: { latitude: number; longitude: number }
    score: number
    rating?: number
    userRatingCount?: number
}

type Room = {
    id: string
    room_code: string
    host_id: string
    status: 'waiting' | 'voting' | 'ended'
    location_coords: { lat: number, lng: number }
    candidates: Candidate[]
}

export function RoomClient({ roomCode, initialRoom, currentUserId }: { roomCode: string, initialRoom: Room, currentUserId: string }) {
    const [participants, setParticipants] = useState<Participant[]>([])
    const [room, setRoom] = useState<Room>(initialRoom)
    const [loading, setLoading] = useState(false)
    const [winner, setWinner] = useState<Candidate | null>(null)

    const supabase = createClient()
    const router = useRouter()
    const isHost = currentUserId === room.host_id

    useEffect(() => {
        // Initial fetch of participants
        const fetchParticipants = async () => {
            const { data } = await supabase.from('participants').select('*').eq('room_id', room.id)
            if (data) setParticipants(data)
        }
        fetchParticipants()

        // Realtime subscription for Room Status & Participants
        const channel = supabase
            .channel('room_updates')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'participants',
                filter: `room_id=eq.${room.id}`
            }, () => {
                fetchParticipants()
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'rooms',
                filter: `id=eq.${room.id}`
            }, (payload) => {
                setRoom(payload.new as Room)
                if (payload.new.status === 'ended') {
                    // Need to calculate winner locally or fetch from DB if we stored it
                    // For MVP, we'll re-calculate on client or fetch votes
                    calculateWinner(payload.new as Room)
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [room.id, supabase])

    const calculateWinner = async (currentRoom: Room) => {
        // Fetch all votes
        const { data: votes } = await supabase
            .from('votes')
            .select('*')
            .eq('room_id', currentRoom.id)
            .eq('vote_type', 'yes')

        if (!votes || votes.length === 0) {
            setWinner(null)
            return
        }

        // Count votes
        const counts: Record<string, number> = {}
        votes.forEach(v => {
            counts[v.place_id] = (counts[v.place_id] || 0) + 1
        })

        // Find max
        let maxVotes = 0
        let winnerId: string | null = null
        Object.entries(counts).forEach(([placeId, count]) => {
            if (count > maxVotes) {
                maxVotes = count
                winnerId = placeId
            }
        })

        if (winnerId) {
            const winCand = currentRoom.candidates.find(c => c.id === winnerId)
            if (winCand) setWinner(winCand)
        }
    }


    const handleStartVoting = async () => {
        setLoading(true)
        try {
            // Call API to fetch places and update room
            const res = await fetch('/api/places/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId: room.id,
                    lat: room.location_coords.lat,
                    lng: room.location_coords.lng
                })
            })
            const data = await res.json()
            if (data.error) throw new Error(data.error)

            // Update room status is handled by API? 
            // API updates candidates and sets status to 'voting'
        } catch (e) {
            console.error(e)
            alert('Failed to start voting: ' + e)
        } finally {
            setLoading(false)
        }
    }

    const handleEndVoting = async () => {
        // Manually close the room
        await supabase.from('rooms').update({ status: 'ended' }).eq('id', room.id)
    }

    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-md shadow-2xl">
            <div className="flex flex-col items-center mb-6">
                <span className="text-slate-400 text-sm uppercase tracking-widest mb-1">Room Code</span>
                <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600 tracking-widest">
                    {roomCode}
                </h2>
                <span className={`text-xs px-2 py-1 rounded-full mt-2 font-mono ${room.status === 'waiting' ? 'bg-blue-900 text-blue-300' :
                    room.status === 'voting' ? 'bg-green-900 text-green-300' :
                        'bg-red-900 text-red-300'
                    }`}>
                    Status: {room.status.toUpperCase()}
                </span>
            </div>

            {room.status === 'waiting' && (
                <>
                    <div className="space-y-3 mb-6">
                        <h3 className="text-slate-300 font-medium">Participants ({participants.length})</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {participants.map((p) => (
                                <div key={p.id} className="bg-slate-700/50 p-3 rounded-lg flex items-center gap-3 border border-slate-600/50">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                                        {p.user_id.slice(0, 2).toUpperCase()}
                                    </div>
                                    <span className="text-slate-200 font-mono text-sm">{p.user_id.slice(0, 8)}...</span>
                                    {p.user_id === room.host_id && <span className="text-xs text-yellow-500 ml-auto">HOST</span>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {isHost ? (
                        <button
                            onClick={handleStartVoting}
                            disabled={loading}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-900/20 disabled:opacity-50"
                        >
                            {loading ? 'Fetching Restaurants...' : 'Start Voting'}
                        </button>
                    ) : (
                        <p className="text-center text-slate-500 text-sm animate-pulse">Waiting for host to start...</p>
                    )}
                </>
            )}

            {room.status === 'voting' && (
                <div className="flex flex-col items-center gap-4">
                    <VotingDeck roomId={room.id} candidates={room.candidates} userId={currentUserId} />

                    {isHost && (
                        <button
                            onClick={handleEndVoting}
                            className="text-xs text-red-400 underline hover:text-red-300 mt-4"
                        >
                            Force End Voting
                        </button>
                    )}
                </div>
            )}

            {room.status === 'ended' && winner && (
                <WinnerReveal winner={winner} />
            )}

            {room.status === 'ended' && !winner && (
                <div className="text-center p-4">
                    <h3 className="text-xl font-bold text-white">Voting Ended</h3>
                    <p className="text-slate-400">Calculating results...</p>
                    {/* Force recalc if stuck */}
                    <button
                        onClick={() => calculateWinner(room)}
                        className="mt-4 text-xs bg-slate-700 px-3 py-1 rounded"
                    >
                        Refresh Results
                    </button>
                </div>
            )}

        </div>
    )
}
