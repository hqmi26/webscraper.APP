'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Check, X, MapPin, Star } from 'lucide-react'

// Define Candidate type based on what we saved
type Candidate = {
    id: string
    displayName: { text: string }
    formattedAddress: string
    score: number // Internal score
    rating?: number
    userRatingCount?: number
    // ... other fields
}

export function VotingDeck({ roomId, candidates, userId }: { roomId: string, candidates: Candidate[], userId: string }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [complete, setComplete] = useState(false)
    const supabase = createClient()

    if (!candidates || candidates.length === 0) {
        return <div className="text-white text-center">No restaurants found. Try expanding search or changing location.</div>
    }

    const currentPlace = candidates[currentIndex]

    const handleVote = async (voteType: 'yes' | 'no') => {
        // Optimistic update
        const nextIndex = currentIndex + 1

        // Send vote to DB
        const { error } = await supabase.from('votes').insert({
            room_id: roomId,
            user_id: userId,
            place_id: currentPlace.id,
            vote_type: voteType
        })

        if (error) {
            console.error('Error casting vote:', error)
            alert('Failed to save vote. Please try again.')
            return
        }

        if (nextIndex >= candidates.length) {
            setComplete(true)
        } else {
            setCurrentIndex(nextIndex)
        }
    }

    if (complete) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl text-center space-y-4">
                <h2 className="text-2xl font-bold text-white">All Voted!</h2>
                <p className="text-slate-400">Waiting for others to finish...</p>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            </div>
        )
    }

    return (
        <div className="relative w-full max-w-sm h-96">
            {/* Card */}
            <div className="absolute inset-0 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
                {/* Mock Image Area (Google Photos API costs extra, using placeholder or map static) */}
                <div className="h-48 bg-slate-700 flex items-center justify-center relative">
                    <MapPin className="text-slate-500 w-12 h-12" />
                    <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs text-white font-bold">{currentPlace.rating || 'N/A'}</span>
                    </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1 line-clamp-2">{currentPlace.displayName.text}</h3>
                        <p className="text-slate-400 text-sm line-clamp-2">{currentPlace.formattedAddress}</p>
                    </div>

                    <div className="flex justify-between items-center pt-4">
                        <button
                            onClick={() => handleVote('no')}
                            className="w-14 h-14 rounded-full bg-slate-700 hover:bg-slate-600 text-red-500 flex items-center justify-center transition-transform active:scale-95 shadow-lg border border-red-500/30"
                        >
                            <X className="w-8 h-8" />
                        </button>

                        <span className="text-slate-500 text-xs uppercase tracking-widest">
                            {currentIndex + 1} / {candidates.length}
                        </span>

                        <button
                            onClick={() => handleVote('yes')}
                            className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center transition-transform active:scale-95 shadow-lg shadow-green-500/20"
                        >
                            <Check className="w-8 h-8" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
