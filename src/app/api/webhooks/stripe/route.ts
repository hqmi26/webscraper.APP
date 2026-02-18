import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/utils/stripe/server';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get('Stripe-Signature') as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err: any) {
        console.error(`Webhook signature verification failed.`, err.message);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (userId) {
            const supabase = await createClient();

            const { error } = await supabase
                .from('profiles')
                .update({
                    is_pro: true,
                    stripe_customer_id: session.customer as string
                })
                .eq('id', userId);

            if (error) {
                console.error('Error updating profile:', error);
                return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
            }
            console.log(`User ${userId} upgraded to Pro.`);
        }
    }

    return NextResponse.json({ received: true });
}
