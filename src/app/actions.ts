'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function createRoom(location: { lat: number, lng: number } | null) {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'You must be signed in to create a room.' }
    }

    // Generate a random 4-digit code
    const roomCode = Math.floor(1000 + Math.random() * 9000).toString()

    // Insert room
    const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
            room_code: roomCode,
            host_id: user.id,
            // Default to "Unknown" location if not provided, or handle null
            location_coords: location || { lat: 0, lng: 0 },
            status: 'waiting'
        })
        .select()
        .single()

    if (roomError) {
        console.error('Error creating room:', roomError)
        return { error: 'Failed to create room' }
    }

    // Add host as participant
    const { error: participantError } = await supabase.from('participants').insert({
        room_id: room.id,
        user_id: user.id
    })

    if (participantError) {
        console.error('Error adding participant:', participantError)
        return { error: 'Failed to join room' }
    }

    redirect(`/room/${roomCode}`)
}

export async function joinRoom(roomCode: string) {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'You must be signed in to join a room.' }
    }

    // Find room
    const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id, status')
        .eq('room_code', roomCode)
        .single()

    if (roomError || !room) {
        return { error: 'Room not found' }
    }

    if (room.status !== 'waiting') {
        return { error: 'Room is already in session or ended' }
    }

    // Add participant
    const { error: participantError } = await supabase
        .from('participants')
        .insert({
            room_id: room.id,
            user_id: user.id
        })
        .select() // Verify insertion

    // Ignore unique constraint error if user already joined
    if (participantError && participantError.code !== '23505') {
        console.error('Error joining room:', participantError)
        return { error: 'Failed to join room' }
    }

    redirect(`/room/${roomCode}`)
}
