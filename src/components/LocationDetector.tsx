'use client'

import { useState } from 'react'

export function LocationDetector({ onLocationDetected }: { onLocationDetected: (coords: { lat: number, lng: number }) => void }) {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleDetect = () => {
        setLoading(true)
        setError(null)

        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser')
            setLoading(false)
            return
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                onLocationDetected({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                })
                setLoading(false)
                setSuccess(true)
            },
            (err) => {
                setError('Unable to retrieve your location')
                setLoading(false)
            }
        )
    }

    return (
        <div className="flex flex-col items-center gap-2">
            <button
                onClick={handleDetect}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${success
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    } disabled:opacity-50`}
                disabled={loading || success}
                type="button"
            >
                {loading ? 'Detecting Location...' : success ? 'Location Detect!' : '📍 Use Current Location'}
            </button>
            {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
        </div>
    )
}
