Import { NextResponse } from "next/server";
import { db } from "@/db";
import { teachers, institutes, votes } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const instituteId = searchParams.get("instituteId");

    const whereConditions = [];
    if (instituteId) {
      whereConditions.push(eq(teachers.instituteId, parseInt(instituteId)));
    }

    const result = await db
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
        instituteName: institutes.name,
        upVotes: sql<number>`COALESCE(SUM(CASE WHEN ${votes.voteType} = 'up' THEN 1 ELSE 0 END), 0)`.mapWith(Number),
        downVotes: sql<number>`COALESCE(SUM(CASE WHEN ${votes.voteType} = 'down' THEN 1 ELSE 0 END), 0)`.mapWith(Number),
      })
      .from(teachers)
      .leftJoin(institutes, eq(teachers.instituteId, institutes.id))
      .leftJoin(votes, eq(teachers.id, votes.teacherId))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(teachers.id, institutes.name)
      .orderBy(sql`${teachers.abilityScore} DESC`);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching teachers:", error);
    return NextResponse.json({ error: "Failed to fetch teachers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, subject, instituteId, photoUrl, bio, experience } = body;

    if (!name || !subject || !instituteId) {
      return NextResponse.json(
        { error: "Name, subject, and institute are required" },
        { status: 400 }
      );
    }

    const [inserted] = await db
      .insert(teachers)
      .values({
        name,
        subject,
        instituteId: parseInt(instituteId),
        photoUrl: photoUrl || "",
        bio: bio || "",
        experience: experience || 0,
      })
      .returning();

    return NextResponse.json(inserted, { status: 201 });
  } catch (error) {
    console.error("Error creating teacher:", error);
    return NextResponse.json({ error: "Failed to create teacher" }, { status: 500 });
  }
}
// 4. DELETE TEACHER (NEW)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Teacher ID is required" }, { status: 400 });
    }

    await db.delete(teachers).where(eq(teachers.id, parseInt(id)));

    return NextResponse.json({ success: true, message: "Teacher deleted successfully" });
  } catch (error) {
    console.error("Error deleting teacher:", error);
    return NextResponse.json({ error: "Failed to delete teacher" }, { status: 500 });
  }
}
