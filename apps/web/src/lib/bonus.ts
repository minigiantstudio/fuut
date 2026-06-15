export const BONUS_QUESTIONS = [
  "Will there be a pitch invader?",
  "Will the coach get a yellow card?",
  "Will a goal be overturned by VAR?",
  "Will there be a red card?",
  "Will there be a goal in stoppage time?",
  "Will a goalkeeper score?",
  "Will there be an own goal?",
  "Will the first goal be a header?",
  "Will there be a penalty?",
  "Will a substitute score?",
];

/**
 * Deterministic positive index from a matchId string.
 */
export const fallbackQuestionIndex = (matchId: string, modulus: number) => {
  if (modulus <= 0) return 0;
  let acc = 0;
  for (let i = 0; i < matchId.length; i++) {
    acc = (acc + matchId.charCodeAt(i)) % modulus;
  }
  return acc;
};

/**
 * Returns the resolved bonus question for a match.
 */
export const getBonusQuestion = (matchId: string, bonusQuestion: string | null) => {
  if (bonusQuestion) return bonusQuestion;
  return BONUS_QUESTIONS[fallbackQuestionIndex(matchId, BONUS_QUESTIONS.length)];
};
