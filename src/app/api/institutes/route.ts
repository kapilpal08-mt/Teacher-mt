import { NextResponse } from "next/server";
import { db } from "@/db";
import { institutes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allInstitutes = await db.select().from(institutes).orderBy(institutes.name);
    return NextResponse.json(allInstitutes);
  } catch (error) {
    console.error("Error fetching institutes:", error);
    return NextResponse.json({ error: "Failed to fetch institutes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, location, mapsUrl } = body;
    if (!name) {
      return NextResponse.json({ error: "Institute name is required" }, { status: 400 });
    }
    const [inserted] = await db.insert(institutes).values({
      name,
      location: location || "",
      mapsUrl: mapsUrl || "",
    }).returning();
    return NextResponse.json(inserted, { status: 201 });
  } catch (error) {
    console.error("Error creating institute:", error);
    return NextResponse.json({ error: "Failed to create institute" }, { status: 500 });
  }
}
