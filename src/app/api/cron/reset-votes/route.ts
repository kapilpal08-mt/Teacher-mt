import { db } from "@/db";
import { votesTable } from "@/db/schema";
import { NextResponse } from "next/server";

// Monthly Vote Reset API Route
export async function GET(request: Request) {
  try {
    // Secret Key Check
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    const CRON_SECRET = process.env.CRON_SECRET || "my_super_secret_cron_key_123";

    if (secret !== CRON_SECRET) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access!" },
        { status: 401 }
      );
    }

    // Purane sabhi votes ko delete/reset karna
    await db.delete(votesTable);

    return NextResponse.json({
      success: true,
      message: "Naya mahina shuru ho gaya hai! Sabhi teachers ke votes reset (0) ho gaye hain.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron reset error:", error);
    return NextResponse.json(
      { success: false, message: "Votes reset karne me error aaya.", error },
      { status: 500 }
    );
  }
}
