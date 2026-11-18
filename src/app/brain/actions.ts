"use server";

import { requireMember } from "@/lib/hub";
import { answerQuestion } from "@/lib/brain";
import type { BrainAnswer } from "@/lib/brain-shared";

/** Cualquier miembro activo del hub puede preguntar. Devuelve el error como dato (los `throw` se enmascaran en producción). */
export async function askBrain(question: string): Promise<BrainAnswer> {
  const member = await requireMember();
  return answerQuestion(member.id, question);
}
