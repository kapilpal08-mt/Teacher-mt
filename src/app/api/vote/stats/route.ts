import { NextResponse } from "next/server";
import { db } from "@/db";
import { voteLog, teachers, institutes } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    // Total vote count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(voteLog);

    // Recent vote activity
    const recentActivity = await db
      .select({
        id: voteLog.id,
        teacherId: voteLog.teacherId,
        teacherName: teachers.name,
        instituteName: institutes.name,
        voteType: voteLog.voteType,
        action: voteLog.action,
        oldVoteType: voteLog.oldVoteType,
        loggedAt: voteLog.loggedAt,
      })
      .from(voteLog)
      .leftJoin(teachers, eq(voteLog.teacherId, teachers.id))
      .leftJoin(institutes, eq(teachers.instituteId, institutes.id))
      .orderBy(sql`${voteLog.loggedAt} DESC`)
      .limit(50);

    return NextResponse.json({
      totalVotes: totalResult?.count ?? 0,
      recentActivity,
    });
  } catch (error) {
    console.error("Error fetching vote stats:", error);
    return NextResponse.json({ error: "Failed to fetch vote stats" }, { status: 500 });
  }
}
