import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = createServerClient()

    const { data: session, error: sessionError } = await supabase
        .from('research_sessions')
        .select('*')
        .eq('id', id)
        .single()

    if (sessionError) {
        return NextResponse.json({ error: sessionError.message }, { status: 500 })
    }

    const { data: steps, error: stepsError } = await supabase
        .from('research_steps')
        .select('*')
        .eq('session_id', id)
        .order('created_at', { ascending: true })

    if (stepsError) {
        return NextResponse.json({ error: stepsError.message }, { status: 500 })
    }

    return NextResponse.json({ session, steps })
}
