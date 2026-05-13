import axios from 'axios';

/**
 * Football-Data.org API v4 Client
 * 
 * Free Tier limits: 10 requests / minute
 */
export class FootballApiClient {
  private client;
  private competitionId = 'WC'; // World Cup

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('FOOTBALL_DATA_API_KEY is missing');
    }

    this.client = axios.create({
      baseURL: 'https://api.football-data.org/v4',
      headers: {
        'X-Auth-Token': apiKey,
      },
    });
  }

  /**
   * Fetches all matches for the configured competition.
   */
  async getMatches() {
    try {
      const response = await this.client.get(`/competitions/${this.competitionId}/matches`);
      return response.data.matches;
    } catch (error) {
      console.error('Error fetching matches from Football-Data:', error);
      throw error;
    }
  }

  /**
   * Fetches matches filtered by status (e.g., 'LIVE', 'FINISHED').
   */
  async getMatchesByStatus(status: string) {
    try {
      const response = await this.client.get(`/competitions/${this.competitionId}/matches`, {
        params: { status },
      });
      return response.data.matches;
    } catch (error) {
      console.error(`Error fetching ${status} matches from Football-Data:`, error);
      throw error;
    }
  }

  /**
   * Fetches matches for a specific date range.
   */
  async getMatchesByDate(dateFrom: string, dateTo: string) {
    try {
      const response = await this.client.get(`/competitions/${this.competitionId}/matches`, {
        params: { dateFrom, dateTo },
      });
      return response.data.matches;
    } catch (error) {
      console.error(`Error fetching matches from ${dateFrom} to ${dateTo} from Football-Data:`, error);
      throw error;
    }
  }
}
