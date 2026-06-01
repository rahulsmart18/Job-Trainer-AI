import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isMissingColumnError } from "@/lib/checkout-store";

function isSchemaError(message: string): boolean {
  return isMissingColumnError(message) || /relation.*does not exist/i.test(message);
}

export async function saveMockInterviewSession(
  userId: string,
  averageScore: number,
  summary: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from("mock_interviews").insert({
    user_id: userId,
    rounds_completed: 3,
    average_score: averageScore,
    summary,
  });

  if (error && !isSchemaError(error.message)) {
    console.error("Failed to save mock interview session:", error.message);
  }
}
