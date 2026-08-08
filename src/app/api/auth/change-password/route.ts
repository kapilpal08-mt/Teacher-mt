import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { writeFile } from "fs/promises";
import path from "path";

const secret = new TextEncoder().encode(process.env.ADMIN_PASSWORD || "miltadmin123");

export async function POST(request: Request) {
  try {
    // Verify admin is logged in
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = Object.fromEntries(
      cookieHeader.split("; ").map((c) => c.split("="))
    );
    const token = cookies["admin_token"];

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
      await jwtVerify(token, secret);
    } catch {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Both passwords are required" }, { status: 400 });
    }

    if (currentPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
    }

    // Update the .env file
    const envPath = path.join(process.cwd(), ".env");
    const envContent = `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db\nADMIN_PASSWORD=${newPassword}\n`;

    await writeFile(envPath, envContent, "utf-8");

    // Update runtime env
    process.env.ADMIN_PASSWORD = newPassword;

    // Clear old token by setting expired cookie
    const response = NextResponse.json({
      success: true,
      message: "Password changed successfully. Please login again with the new password.",
    });

    response.cookies.set("admin_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
