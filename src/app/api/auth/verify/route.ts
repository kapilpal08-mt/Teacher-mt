import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function GET(request: Request) {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json({ authenticated: false }, { status: 500 });
    }

    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = Object.fromEntries(
      cookieHeader.split("; ").map((c) => {
        const [key, ...v] = c.split("=");
        return [key, v.join("=")];
      })
    );
    const token = cookies["admin_token"];

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const secret = new TextEncoder().encode(adminPassword);
    await jwtVerify(token, secret);

    return NextResponse.json({ authenticated: true });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
