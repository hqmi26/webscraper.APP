import { createClient } from '@/utils/supabase/server'
import { RoomClient } from '@/components/RoomClient'
import { notFound, redirect } from 'next/navigation'

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/') // Or handle anonymous auth again
    }

    // Fetch room details
    const { data: room, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_code', code)
        .single()

    if (error || !room) {
        return notFound()
    }

    return (
        <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <RoomClient roomCode={code} initialRoom={room} currentUserId={user.id} />
        </main>
    )
}
