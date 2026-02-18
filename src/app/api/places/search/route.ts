import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
const PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchNearby'

type Place = {
    id: string
    displayName: { text: string }
    formattedAddress: string
    location: { latitude: number; longitude: number }
    types: string[]
    primaryType: string
    priceLevel?: string
    rating?: number
    userRatingCount?: number
}

export async function POST(req: Request) {
    const { roomId, lat, lng, radius = 1000 } = await req.json()
    const supabase = await createClient()

    if (!roomId || !lat || !lng) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Fetch Room Participants to get their IDs
    const { data: participants, error: partError } = await supabase
        .from('participants')
        .select('user_id')
        .eq('room_id', roomId)

    if (partError || !participants) {
        return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 })
    }

    const userIds = participants.map(p => p.user_id)

    // 2. Fetch Dining History for these users
    const { data: history, error: historyError } = await supabase
        .from('dining_history')
        .select('cuisine')
        .in('user_id', userIds)
        .gte('eaten_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days

    const penaltyMap: Record<string, number> = {}
    if (history) {
        history.forEach(h => {
            // Normalize cuisine/type
            const cuisine = h.cuisine.toLowerCase()
            penaltyMap[cuisine] = (penaltyMap[cuisine] || 0) + 1
        })
    }

    // 3. Call Google Places API (New)
    try {
        const response = await fetch(PLACES_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY!,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.primaryType,places.priceLevel,places.rating,places.userRatingCount',
            },
            body: JSON.stringify({
                includedTypes: ['restaurant', 'food'],
                locationRestriction: {
                    circle: {
                        center: { latitude: lat, longitude: lng },
                        radius: radius,
                    },
                },
                maxResultCount: 20, // Fetch top 20
            }),
        })

        const data = await response.json()
        if (!data.places) {
            console.error('No places found or API error', data)
            return NextResponse.json({ error: 'No places found' }, { status: 404 })
        }

        let places: Place[] = data.places

        // 4. Apply Weighted Algorithm
        // Calculate a score: Base score (rating) - Penalty
        // Detailed logic: 
        // - Base score = rating (0-5)
        // - Penalty = 1.0 for each time this "primaryType" or "types" appears in history

        const candidates = places.map(place => {
            let penalty = 0

            // Check primary type
            if (place.primaryType && penaltyMap[place.primaryType.toLowerCase()]) {
                penalty += penaltyMap[place.primaryType.toLowerCase()]
            }

            // Check other types (partial match)
            place.types.forEach(t => {
                // Simple check: if type contains string from history (e.g. "japanese_restaurant" contains "japanese")
                // This is a naive implementation, can be improved with better mapping
                Object.keys(penaltyMap).forEach(historyCuisine => {
                    if (t.toLowerCase().includes(historyCuisine)) {
                        penalty += penaltyMap[historyCuisine] * 0.5 // Smaller penalty for secondary types
                    }
                })
            })

            // Calculate final score
            // Default to 4.0 if no rating
            const baseScore = place.rating || 4.0
            const finalScore = baseScore - penalty

            return {
                ...place,
                score: finalScore
            }
        })

        // Sort by score descending
        candidates.sort((a, b) => b.score - a.score)

        // 5. Update Room with Candidates & Status
        const { error: updateError } = await supabase
            .from('rooms')
            .update({
                candidates: candidates,
                status: 'voting'
            })
            .eq('id', roomId)

        if (updateError) {
            console.error('Error updating room', updateError)
            return NextResponse.json({ error: 'Failed to update room' }, { status: 500 })
        }

        return NextResponse.json({ success: true, count: candidates.length })

    } catch (err: any) {
        console.error('API Error', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
