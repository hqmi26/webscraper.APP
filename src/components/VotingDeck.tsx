'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { calculateMatchScore } from '@/utils/matching'
import { Check, X, Star, Flame, Clock, Heart, SlidersHorizontal, Info, Home, Search, MessageSquare, User } from 'lucide-react'


// Define Candidate type based on what we saved
type Candidate = {
    id: string
    displayName: { text: string }
    formattedAddress: string
    score: number // Internal score
    rating?: number
    userRatingCount?: number
    priceLevel?: string // e.g., '$$$'
    // ... other fields
}

export function VotingDeck({ roomId, candidates, userId, userProfile }: { roomId: string, candidates: Candidate[], userId: string, userProfile?: any }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [complete, setComplete] = useState(false)
    const [myLikes, setMyLikes] = useState<Candidate[]>([])
    const supabase = createClient()

    if (!candidates || candidates.length === 0) {
        return <div className="text-white text-center">No restaurants found. Try expanding search or changing location.</div>
    }

    const currentPlace = candidates[currentIndex]

    // Calculate match percentage based on profile (mock logic for now)
    const matchPercentage = userProfile ? calculateMatchScore(userProfile, currentPlace) : 85

    const handleVote = async (voteType: 'yes' | 'no') => {
        // Optimistic update
        const nextIndex = currentIndex + 1

        if (voteType === 'yes') {
            setMyLikes([...myLikes, currentPlace])
        }

        // Send vote to DB
        const { error } = await supabase.from('votes').insert({
            room_id: roomId,
            user_id: userId,
            place_id: currentPlace.id,
            vote_type: voteType
        })

        if (error) {
            console.error('Error casting vote:', error)
            // Ideally revert the like if it failed, but for now we alert
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
            <div className="flex flex-col items-center w-full max-w-sm gap-6">
                <div className="flex flex-col items-center justify-center p-8 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl text-center space-y-4 w-full">
                    <h2 className="text-2xl font-bold text-white">All Voted!</h2>
                    <p className="text-slate-400">Waiting for others to finish...</p>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                </div>

                {myLikes.length > 0 && (
                    <div className="w-full bg-slate-800 rounded-xl border border-slate-700 p-4">
                        <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-3">You Liked ({myLikes.length})</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                            {myLikes.map(place => (
                                <div key={place.id} className="flex items-center gap-3 p-2 bg-slate-700/50 rounded-lg">
                                    <div className="w-8 h-8 rounded bg-green-900/50 flex items-center justify-center text-green-400">
                                        <Check className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-white truncate">{place.displayName.text}</div>
                                        <div className="text-xs text-slate-400 truncate">{place.formattedAddress}</div>
                                    </div>
                                    {place.rating && (
                                        <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded">
                                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                            <span className="text-xs text-white font-bold">{place.rating}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-sm">
            <div className="relative w-full h-96">
                {/* Card */}
                <div className="absolute inset-0 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
                    {/* Mock Image Area */}
                    <div className="h-48 bg-slate-700 flex items-center justify-center relative">
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                        <MapPin className="text-slate-500 w-12 h-12" />

                        <div className="absolute top-2 right-2 z-10 bg-black/60 px-2 py-1 rounded flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs text-white font-bold">{currentPlace.rating || 'N/A'}</span>
                        </div>

                        {/* Match Percentage Badge */}
                        <div className="absolute bottom-2 right-2 z-10 bg-orange-600/90 px-2 py-1 rounded-full text-xs text-white font-bold shadow-sm border border-orange-500/30">
                            {matchPercentage}% Match
                        </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1 line-clamp-2">{currentPlace.displayName.text}</h3>
                            <p className="text-slate-400 text-sm line-clamp-2">{currentPlace.formattedAddress}</p>

                            <div className="flex items-center gap-2 mt-2">
                                {currentPlace.priceLevel && (
                                    <span className="text-xs text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">{currentPlace.priceLevel}</span>
                                )}
                            </div>
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

            {/* Live Likes List (During Voting) */}
            {myLikes.length > 0 && (
                <div className="w-full bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 backdrop-blur-sm">
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center justify-between">
                        <span>Your Likes</span>
                        <span className="bg-slate-700 px-2 py-0.5 rounded-full text-white text-[10px]">{myLikes.length}</span>
                    </h3>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {myLikes.map(place => (
                            <div key={place.id} className="flex-shrink-0 w-32 bg-slate-800 border border-slate-600 rounded-lg p-2.5 flex flex-col gap-1 shadow-sm">
                                <div className="text-xs font-bold text-white truncate" title={place.displayName.text}>
                                    {place.displayName.text}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                    <span className="text-[10px] text-slate-300">{place.rating || '-'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
