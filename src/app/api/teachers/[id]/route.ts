import { NextResponse } from "next/server";
import { db } from "@/db";
import { teachers, votes, voteLog } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [teacher] = await db
      .select({
        id: teachers.id,
        name: teachers.name,
        subject: teachers.subject,
        instituteId: teachers.instituteId,
        photoUrl: teachers.photoUrl,
        bio: teachers.bio,
        experience: teachers.experience,
        status: teachers.status,
        abilityScore: teachers.abilityScore,
        createdAt: teachers.createdAt,
        upVotes: sql<number>`COALESCE(SUM(CASE WHEN ${votes.voteType} = 'up' THEN 1 ELSE 0 END), 0)`.mapWith(Number),
        downVotes: sql<number>`COALESCE(SUM(CASE WHEN ${votes.voteType} = 'down' THEN 1 ELSE 0 END), 0)`.mapWith(Number),
      })
      .from(teachers)
      .leftJoin(votes, eq(teachers.id, votes.teacherId))
      .where(eq(teachers.id, parseInt(id)))
      .groupBy(teachers.id);

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }
    return NextResponse.json(teacher);
  } catch (error) {
    console.error("Error fetching teacher:", error);
    return NextResponse.json({ error: "Failed to fetch teacher" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const [updated] = await db
      .update(teachers)
      .set({
        name: body.name,
        subject: body.subject,
        instituteId: body.instituteId,
        photoUrl: body.photoUrl,
        bio: body.bio,
        experience: body.experience,
        status: body.status,
        abilityScore: body.abilityScore,
      })
      .where(eq(teachers.id, parseInt(id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating teacher:", error);
    return NextResponse.json({ error: "Failed to update teacher" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teacherId = parseInt(id);

    // Delete related votes and vote logs first (cascade should handle this, but being explicit)
    await db.delete(voteLog).where(eq(voteLog.teacherId, teacherId));
    await db.delete(votes).where(eq(votes.teacherId, teacherId));
    await db.delete(teachers).where(eq(teachers.id, teacherId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting teacher:", error);
    return NextResponse.json({ error: "Failed to delete teacher" }, { status: 500 });
  }
}
