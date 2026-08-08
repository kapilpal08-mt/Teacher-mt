import { NextResponse } from "next/server";
import { db, pool } from "@/db";
import { votes, voteLog, teachers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { teacherId, voterFingerprint, voteType } = body;

    if (!teacherId || !voterFingerprint) {
      return NextResponse.json(
        { error: "teacherId and voterFingerprint are required" },
        { status: 400 }
      );
    }

    if (voteType !== "up" && voteType !== "down") {
      return NextResponse.json(
        { error: "voteType must be 'up' or 'down'" },
        { status: 400 }
      );
    }

    const tId = parseInt(teacherId);

    // Check if this voter already voted for this teacher
    const [existingVote] = await db
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.teacherId, tId),
          eq(votes.voterFingerprint, voterFingerprint)
        )
      );

    if (existingVote) {
      if (existingVote.voteType === voteType) {
        return NextResponse.json(
          { error: "You have already cast this vote", alreadyVoted: true },
          { status: 409 }
        );
      }

      // Update vote type (change from up to down or vice versa)
      const oldType = existingVote.voteType;
      await db
        .update(votes)
        .set({ voteType })
        .where(
          and(
            eq(votes.teacherId, tId),
            eq(votes.voterFingerprint, voterFingerprint)
          )
        );

      // Log the change
      await db.insert(voteLog).values({
        teacherId: tId,
        voterFingerprint,
        voteType,
        action: "change",
        oldVoteType: oldType,
      });

      // Update ability score using raw SQL via pg pool
      const scoreChange = (voteType === "up" ? 10 : -10) - (oldType === "up" ? 10 : -10);
      await pool.query(
        "UPDATE teachers SET ability_score = GREATEST(0, ability_score + $1) WHERE id = $2",
        [scoreChange, tId]
      );

      return NextResponse.json({
        success: true,
        message: "Vote updated successfully",
        changed: true,
      });
    }

    // New vote
    await db.insert(votes).values({
      teacherId: tId,
      voterFingerprint,
      voteType,
    });

    // Log the vote
    await db.insert(voteLog).values({
      teacherId: tId,
      voterFingerprint,
      voteType,
      action: "cast",
    });

    // Update ability score using raw SQL via pg pool
    const scoreChange = voteType === "up" ? 10 : -10;
    await pool.query(
      "UPDATE teachers SET ability_score = GREATEST(0, ability_score + $1) WHERE id = $2",
      [scoreChange, tId]
    );

    return NextResponse.json({
      success: true,
      message: "Vote cast successfully",
    });
  } catch (error) {
    console.error("Error casting vote:", error);
    return NextResponse.json({ error: "Failed to cast vote" }, { status: 500 });
  }
}
