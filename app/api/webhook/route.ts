import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const data = await request.json();

    if (!data || typeof data !== "object") {
      console.warn("Invalid webhook payload received");
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { notification_type, ...rest } = data;

    // Validate notification_type explicitly
    if (typeof notification_type !== "string") {
      return NextResponse.json({ error: "Missing or invalid notification type" }, { status: 400 });
    }

    switch (notification_type) {
      case "eager":
        console.log("✅ Video processing completed:", rest);
        // You can optionally update your DB here
        break;

      case "moderation":
        console.log("🛡 Moderation result:", rest);
        // Optional: Save moderation result to DB
        break;

      default:
        console.warn("⚠️ Unknown webhook event received:", notification_type, rest);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Webhook error:", error.message || error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
