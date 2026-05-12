import cron from 'node-cron';
import { FootballApiClient } from '../services/football-api';
import { ScoringService } from '../services/scoring.service';
import { subMinutes, addMinutes, isBefore, isAfter } from 'date-fns';

export class ScoringJob {
  private footballApi: FootballApiClient;
  private scoringService: ScoringService;
  private supabase;

  constructor(supabaseClient: any, footballApiKey: string) {
    this.supabase = supabaseClient;
    this.footballApi = new FootballApiClient(footballApiKey);
    this.scoringService = new ScoringService(supabaseClient);
  }

  /**
   * Initializes the cron job to run every 5 minutes.
   */
  public start() {
    console.log('Starting Scoring Job Cron (every 5 minutes)...');
    cron.schedule('*/5 * * * *', () => {
      this.run();
    });
  }

  /**
   * Main execution logic.
   */
  public async run() {
    try {
      if (!(await this.isLiveWindow())) {
        console.log('ScoringJob: Outside of live window, skipping API call.');
        return;
      }

      console.log('ScoringJob: Inside live window, fetching match results...');
      const matches = await this.footballApi.getMatches();
      
      for (const apiMatch of matches) {
        // 1. Find matching match in our DB
        // Note: We'd ideally store the external API's match ID in our DB.
        // For now, we match by teams and date (simplified).
        const { data: dbMatch } = await this.supabase
          .from('matches')
          .select('*')
          .eq('home_team', apiMatch.homeTeam.name)
          .eq('away_team', apiMatch.awayTeam.name)
          .single();

        if (!dbMatch || dbMatch.is_final || dbMatch.is_manual_override) continue;

        // 2. Update scores in DB
        const isFinished = apiMatch.status === 'FINISHED';
        const homeScore = apiMatch.score.fullTime.home;
        const awayScore = apiMatch.score.fullTime.away;

        if (homeScore !== null && awayScore !== null) {
          const { error: updateError } = await this.supabase
            .from('matches')
            .update({
              home_score: homeScore,
              away_score: awayScore,
              is_final: isFinished,
            })
            .eq('id', dbMatch.id);

          if (updateError) {
            console.error(`Error updating match ${dbMatch.id}:`, updateError);
            continue;
          }

          // 3. If finished, trigger scoring
          if (isFinished) {
            console.log(`ScoringJob: Match ${dbMatch.id} finished. Scoring...`);
            await this.scoringService.scoreMatch(dbMatch.id);
          }
        }
      }
    } catch (error) {
      console.error('ScoringJob error:', error);
    }
  }

  /**
   * Determines if we are currently in a "Live Window" for polling.
   * Window: 15 mins before kickoff until 4 hours after kickoff.
   */
  private async isLiveWindow(): Promise<boolean> {
    const { data: activeMatches, error } = await this.supabase
      .from('matches')
      .select('kickoff_at')
      .eq('is_final', false);

    if (error || !activeMatches) return false;

    const now = new Date();
    return activeMatches.some((m: any) => {
      const kickoff = new Date(m.kickoff_at);
      const windowStart = subMinutes(kickoff, 15);
      const windowEnd = addMinutes(kickoff, 240); // 4 hours buffer

      return isAfter(now, windowStart) && isBefore(now, windowEnd);
    });
  }
}
