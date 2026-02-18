'use client'

import { MapPin } from 'lucide-react'

// Reusing Candidate type or importing it properly in a real app
type Candidate = {
    id: string
    displayName: { text: string }
    formattedAddress: string
    location: { latitude: number; longitude: number }
}

export function WinnerReveal({ winner }: { winner: Candidate }) {
    if (!winner) {
        return (
            <div className="bg-slate-800 p-8 rounded-2xl text-center">
                <h2 className="text-2xl font-bold text-white mb-2">No Winner</h2>
                <p className="text-slate-400">It seems no one voted "Yes" for any place!</p>
            </div>
        )
    }

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(winner.displayName.text)}&query_place_id=${winner.id}`

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-800/90 rounded-2xl border border-orange-500/50 shadow-[0_0_50px_rgba(249,115,22,0.3)] text-center space-y-6 max-w-md w-full animate-in fade-in zoom-in duration-500">
            <div className="space-y-2">
                <span className="text-xs font-bold tracking-[0.2em] text-orange-500 uppercase">We Have a Winner</span>
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">
                    {winner.displayName.text}
                </h1>
                <p className="text-slate-400">{winner.formattedAddress}</p>
            </div>

            <div className="w-full h-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>

            <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-full transition-all hover:scale-105 shadow-xl shadow-blue-900/30"
            >
                <MapPin className="w-5 h-5" />
                Get Directions
            </a>
        </div>
    )
}
