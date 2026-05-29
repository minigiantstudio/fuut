export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      bonus_question_catalog: {
        Row: {
          category: string | null
          created_at: string
          id: string
          prompt_text: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          prompt_text: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          prompt_text?: string
        }
        Relationships: []
      }
      leaderboard_snapshots: {
        Row: {
          bonus_points: number
          exact_matches: number
          id: string
          league_id: string
          rank: number
          rank_delta: number
          snapshot_at: string
          total_points: number
          user_id: string
        }
        Insert: {
          bonus_points?: number
          exact_matches?: number
          id?: string
          league_id: string
          rank: number
          rank_delta?: number
          snapshot_at?: string
          total_points: number
          user_id: string
        }
        Update: {
          bonus_points?: number
          exact_matches?: number
          id?: string
          league_id?: string
          rank?: number
          rank_delta?: number
          snapshot_at?: string
          total_points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_snapshots_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      league_members: {
        Row: {
          id: string
          joined_at: string
          league_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          league_id: string
          role: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          league_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          created_at: string
          created_by: string
          id: string
          invite_code: string
          name: string
          tier: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          invite_code: string
          name: string
          tier?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string
          name?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "leagues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_score: number | null
          away_team: string
          bonus_question: string | null
          bonus_result: boolean | null
          home_score: number | null
          home_team: string
          id: string
          is_final: boolean
          is_manual_override: boolean
          kickoff_at: string
          stage: string
        }
        Insert: {
          away_score?: number | null
          away_team: string
          bonus_question?: string | null
          bonus_result?: boolean | null
          home_score?: number | null
          home_team: string
          id?: string
          is_final?: boolean
          is_manual_override?: boolean
          kickoff_at: string
          stage: string
        }
        Update: {
          away_score?: number | null
          away_team?: string
          bonus_question?: string | null
          bonus_result?: boolean | null
          home_score?: number | null
          home_team?: string
          id?: string
          is_final?: boolean
          is_manual_override?: boolean
          kickoff_at?: string
          stage?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          away_score: number
          bonus_answer: boolean | null
          created_at: string
          home_score: number
          id: string
          is_bonus_scored: boolean
          is_scored: boolean
          league_id: string
          match_id: string
          points: number
          points_bonus: number
          points_match: number
          user_id: string
        }
        Insert: {
          away_score: number
          bonus_answer?: boolean | null
          created_at?: string
          home_score: number
          id?: string
          is_bonus_scored?: boolean
          is_scored?: boolean
          league_id: string
          match_id: string
          points?: number
          points_bonus?: number
          points_match?: number
          user_id: string
        }
        Update: {
          away_score?: number
          bonus_answer?: boolean | null
          created_at?: string
          home_score?: number
          id?: string
          is_bonus_scored?: boolean
          is_scored?: boolean
          league_id?: string
          match_id?: string
          points?: number
          points_bonus?: number
          points_match?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      snapshot_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          league_id: string
          snapshot_payload: Json
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          league_id: string
          snapshot_payload: Json
          token: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          league_id?: string
          snapshot_payload?: Json
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "snapshot_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snapshot_tokens_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_anonymous: boolean
          nickname: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_anonymous?: boolean
          nickname: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_anonymous?: boolean
          nickname?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_email_exists: { Args: { p_email: string }; Returns: boolean }
      create_league: {
        Args: { p_name: string }
        Returns: {
          id: string
          invite_code: string
        }[]
      }
      get_leaderboard: {
        Args: { p_league_id: string }
        Returns: {
          bonus_points: number
          exact_matches: number
          nickname: string
          rank: number
          rank_delta: number
          total_points: number
          user_id: string
        }[]
      }
      get_league_members_with_nicknames: {
        Args: { p_league_id: string }
        Returns: {
          id: string
          joined_at: string
          league_id: string
          nickname: string
          role: string
          user_id: string
        }[]
      }
      get_match_predictions: {
        Args: { p_league_id: string; p_match_id: string }
        Returns: {
          away_score: number
          bonus_answer: boolean
          home_score: number
          nickname: string
          points: number
          role: string
          user_id: string
        }[]
      }
      get_matches_with_bonus: {
        Args: never
        Returns: {
          away_score: number
          away_team: string
          bonus_question: string
          bonus_result: boolean
          group_name: string
          home_score: number
          home_team: string
          id: string
          is_bonus_revealed: boolean
          is_final: boolean
          is_manual_override: boolean
          kickoff_at: string
          reveal_at: string
          stage: string
        }[]
      }
      is_any_league_admin: { Args: never; Returns: boolean }
      is_league_admin: { Args: { p_league_id: string }; Returns: boolean }
      is_league_member: { Args: { p_league_id: string }; Returns: boolean }
      join_league_by_code: {
        Args: { p_code: string }
        Returns: {
          league_id: string
          league_name: string
          member_role: string
        }[]
      }
      lookup_league_by_invite_code: {
        Args: { p_code: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      regenerate_invite_code: {
        Args: { p_league_id: string }
        Returns: {
          invite_code: string
        }[]
      }
      remove_member: {
        Args: { p_league_id: string; p_user_id: string }
        Returns: undefined
      }
      rename_league: {
        Args: { p_league_id: string; p_new_name: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

