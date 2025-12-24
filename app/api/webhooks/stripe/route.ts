import { headers } from "next/headers";
import Stripe from "stripe";

import { env } from "@/env.mjs";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { recordCommission } from "@/lib/affiliate";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Retrieve the subscription details from Stripe.
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string,
    );

    // Update the user stripe into in our database.
    // Since this is the initial subscription, we need to update
    // the subscription id and customer id.
    await prisma.user.update({
      where: {
        id: session?.metadata?.userId,
      },
      data: {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        stripePriceId: subscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: new Date(
          subscription.current_period_end * 1000,
        ),
      },
    });

    // Record affiliate commission for the initial payment
    if (session?.metadata?.userId && session.amount_total) {
      try {
        // Convert from cents to dollars
        const amountInDollars = session.amount_total / 100;
        await recordCommission(
          session.metadata.userId,
          amountInDollars,
          session.payment_intent as string || session.id
        );
        console.log(`Recorded affiliate commission for user ${session.metadata.userId}: $${amountInDollars * 0.25}`);
      } catch (error) {
        console.error("Error recording affiliate commission:", error);
      }
    }
  }

  if (event.type === "invoice.payment_succeeded") {
    const session = event.data.object as Stripe.Invoice;

    // If the billing reason is not subscription_create, it means the customer has updated their subscription.
    // If it is subscription_create, we don't need to update the subscription id and it will handle by the checkout.session.completed event.
    if (session.billing_reason != "subscription_create") {
      // Retrieve the subscription details from Stripe.
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string,
      );

      // Update the price id and set the new period end.
      const updatedUser = await prisma.user.update({
        where: {
          stripeSubscriptionId: subscription.id,
        },
        data: {
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: new Date(
            subscription.current_period_end * 1000,
          ),
        },
      });

      // Record affiliate commission for recurring payments
      if (updatedUser && session.amount_paid) {
        try {
          // Convert from cents to dollars
          const amountInDollars = session.amount_paid / 100;
          await recordCommission(
            updatedUser.id,
            amountInDollars,
            session.payment_intent as string || session.id
          );
          console.log(`Recorded recurring affiliate commission for user ${updatedUser.id}: $${amountInDollars * 0.25}`);
        } catch (error) {
          console.error("Error recording affiliate commission:", error);
        }
      }
    }
  }

  return new Response(null, { status: 200 });
}

