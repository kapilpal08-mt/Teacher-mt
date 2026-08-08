import { NextResponse } from "next/server";
import { db } from "@/db";
import { institutes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const [updated] = await db
      .update(institutes)
      .set({ name: body.name, location: body.location, mapsUrl: body.mapsUrl || "" })
      .where(eq(institutes.id, parseInt(id)))
      .returning();
    if (!updated) {
      return NextResponse.json({ error: "Institute not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating institute:", error);
    return NextResponse.json({ error: "Failed to update institute" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delete(institutes).where(eq(institutes.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting institute:", error);
    return NextResponse.json({ error: "Failed to delete institute" }, { status: 500 });
  }
}
