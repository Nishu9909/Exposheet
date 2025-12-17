import { Transaction, Prediction } from '../types';

export const analyzeRecurringBills = (transactions: Transaction[]): Prediction | null => {
  if (transactions.length < 5) return null;

  const expenses = transactions.filter(t => t.type === 'expense');
  const groups: Record<string, Transaction[]> = {};

  // Group by description (normalized)
  expenses.forEach(t => {
    const desc = t.description.toLowerCase().trim();
    if (!groups[desc]) groups[desc] = [];
    groups[desc].push(t);
  });

  const today = new Date();
  let bestPrediction: Prediction | null = null;

  Object.entries(groups).forEach(([desc, history]) => {
    // Basic Heuristic: Must have at least 2 occurrences
    if (history.length < 2) return;

    // Sort by date descending
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const lastTx = history[0];
    const lastDate = new Date(lastTx.date);
    
    // Check if it's roughly monthly (25-35 days gap)
    const prevTx = history[1];
    const prevDate = new Date(prevTx.date);
    const dayDiff = (lastDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24);

    if (dayDiff >= 25 && dayDiff <= 35) {
      // It looks monthly. Predict next date.
      const nextDate = new Date(lastDate);
      nextDate.setMonth(nextDate.getMonth() + 1);
      
      const timeUntil = nextDate.getTime() - today.getTime();
      const daysUntil = Math.ceil(timeUntil / (1000 * 3600 * 24));

      // Only alert if due within 5 days and in the future
      if (daysUntil >= 0 && daysUntil <= 5) {
         // Prioritize the soonest bill
         if (!bestPrediction || daysUntil < bestPrediction.daysRemaining) {
           bestPrediction = {
             description: lastTx.description,
             predictedDate: nextDate.toISOString().split('T')[0],
             daysRemaining: daysUntil,
             avgAmount: history.reduce((sum, t) => sum + t.amount, 0) / history.length
           };
         }
      }
    }
  });

  return bestPrediction;
};