import { NextResponse } from "next/server";

// POST - Handle contact form submission
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, subject, message } = body;

        if (!name || !email || !subject || !message) {
            return NextResponse.json({ success: false, error: "All fields are required" }, { status: 400 });
        }

        // For now, just log the contact form submission
        // In production, you could:
        // 1. Send an email to yourself
        // 2. Store in a database
        // 3. Send to a Slack channel
        // 4. Use a service like Formspree
        console.log("Contact form submission:", { name, email, subject, message });

        // TODO: Implement email sending with Resend or similar
        // await sendEmail({
        //     to: "your-email@example.com",
        //     subject: `[Progressly Contact] ${subject}`,
        //     html: `<p><strong>From:</strong> ${name} (${email})</p><p>${message}</p>`,
        // });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error handling contact form:", error);
        return NextResponse.json({ success: false, error: "Failed to send message" }, { status: 500 });
    }
}
