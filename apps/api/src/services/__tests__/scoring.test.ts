import { describe, it, expect } from 'vitest';
import { calculatePoints } from '../scoring.service';

describe('calculatePoints', () => {
  it('assigns 3 points for exact score', () => {
    const result = calculatePoints(2, 1, 2, 1, null, null);
    expect(result.pointsMatch).toBe(3);
    expect(result.totalPoints).toBe(3);
  });

  it('assigns 1 point for correct winner (home)', () => {
    const result = calculatePoints(2, 0, 1, 0, null, null);
    expect(result.pointsMatch).toBe(1);
    expect(result.totalPoints).toBe(1);
  });

  it('assigns 1 point for correct winner (away)', () => {
    const result = calculatePoints(0, 2, 0, 1, null, null);
    expect(result.pointsMatch).toBe(1);
    expect(result.totalPoints).toBe(1);
  });

  it('assigns 1 point for correct draw', () => {
    const result = calculatePoints(1, 1, 2, 2, null, null);
    expect(result.pointsMatch).toBe(1);
    expect(result.totalPoints).toBe(1);
  });

  it('assigns 0 points for incorrect outcome', () => {
    const result = calculatePoints(2, 1, 0, 1, null, null);
    expect(result.pointsMatch).toBe(0);
    expect(result.totalPoints).toBe(0);
  });

  it('assigns 2 bonus points for correct bonus prediction', () => {
    const result = calculatePoints(0, 0, 1, 1, true, true);
    expect(result.pointsBonus).toBe(2);
    expect(result.pointsMatch).toBe(1);
    expect(result.totalPoints).toBe(3);
  });

  it('assigns 0 bonus points for incorrect bonus prediction', () => {
    const result = calculatePoints(2, 1, 2, 1, false, true);
    expect(result.pointsBonus).toBe(0);
    expect(result.pointsMatch).toBe(3);
    expect(result.totalPoints).toBe(3);
  });

  it('ignores bonus points if prediction or result is null', () => {
    const result1 = calculatePoints(1, 1, 1, 1, null, true);
    const result2 = calculatePoints(1, 1, 1, 1, true, null);
    expect(result1.pointsBonus).toBe(0);
    expect(result2.pointsBonus).toBe(0);
  });
});
