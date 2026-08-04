import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const numberOfPlayers = Number(body?.numberOfPlayers);
    if (!Number.isFinite(numberOfPlayers) || numberOfPlayers < 1) {
      return NextResponse.json(
        { error: "numberOfPlayers must be a positive number" },
        { status: 400 },
      );
    }

    const toFiniteNumber = (value: unknown) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const cardCombination = Array.isArray(body?.cardCombination)
      ? body.cardCombination.map((card: unknown) => String(card))
      : [];

    const playerCards = Array.isArray(body?.playerCards)
      ? body.playerCards.map((entry: unknown) => ({
          name: String((entry as Record<string, unknown>)?.name || ""),
          card: String((entry as Record<string, unknown>)?.card || ""),
        }))
      : [];

    const record = {
      gameWon: Boolean(body?.gameWon),
      numberOfPlayers,
      numberOfCorrectGuess: toFiniteNumber(body?.numberOfCorrectGuess),
      percentCorrectGuess: toFiniteNumber(body?.percentCorrectGuess),
      numberOfCorrectRank: toFiniteNumber(body?.numberOfCorrectRank),
      percentOfCorrectRank: toFiniteNumber(body?.percentOfCorrectRank),
      highEloMatch: Boolean(body?.highEloMatch),
      botGame: Boolean(body?.botGame),
      cardCombination,
      playerCards,
      createdAt: new Date(),
    };

    const db = await getMongoDb();
    const result = await db.collection("metrics").insertOne(record);

    return NextResponse.json(
      { metric: { ...record, id: result.insertedId.toString() } },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[metrics POST] failed to save metric", { error: message });
    return NextResponse.json(
      {
        error: "Failed to save metric",
        details: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 },
    );
  }
}
