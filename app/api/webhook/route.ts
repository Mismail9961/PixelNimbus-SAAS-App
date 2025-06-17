import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const data = await request.json();

    if (!data || typeof data !== "object") {
      console.warn("Invalid webhook payload received");
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Handle different webhook events
    switch (data.notification_type) {
      case "eager":
        console.log("Video processing completed:", data);
        break;
      case "moderation":
        console.log("Moderation result:", data);
        break;
      default:
        console.log("Unknown webhook event:", data);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
