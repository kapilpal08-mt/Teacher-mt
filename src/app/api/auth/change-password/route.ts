import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Password change via app is disabled on serverless hosting (Netlify). Please update ADMIN_PASSWORD directly in Netlify Environment Variables.",
    },
    { status: 400 }
  );
}
