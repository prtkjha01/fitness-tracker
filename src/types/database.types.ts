
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "body_weights": {
                  Row: {
                    "created_at": string,"id": string,"measured_on": string,"updated_at": string,"user_id": string,"weight_kg": number
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"measured_on": string,"updated_at"?: string,"user_id"?: string,"weight_kg": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"measured_on"?: string,"updated_at"?: string,"user_id"?: string,"weight_kg"?: number
                  }
                  Relationships: [
                    
                  ]
                },"exercises": {
                  Row: {
                    "category": Database["public"]['Enums']["exercise_category"],"created_at": string,"equipment": Database["public"]['Enums']["equipment"],"id": string,"is_archived": boolean,"muscle_group": Database["public"]['Enums']["muscle_group"],"name": string,"tracking_type": Database["public"]['Enums']["tracking_type"],"updated_at": string,"user_id": string | null
                  }
                  Insert: {
                    "category": Database["public"]['Enums']["exercise_category"],"created_at"?: string,"equipment": Database["public"]['Enums']["equipment"],"id"?: string,"is_archived"?: boolean,"muscle_group": Database["public"]['Enums']["muscle_group"],"name": string,"tracking_type": Database["public"]['Enums']["tracking_type"],"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["exercise_category"],"created_at"?: string,"equipment"?: Database["public"]['Enums']["equipment"],"id"?: string,"is_archived"?: boolean,"muscle_group"?: Database["public"]['Enums']["muscle_group"],"name"?: string,"tracking_type"?: Database["public"]['Enums']["tracking_type"],"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"food_entries": {
                  Row: {
                    "calories": number,"carbs_g": number | null,"created_at": string,"fat_g": number | null,"id": string,"logged_on": string,"meal_type": Database["public"]['Enums']["meal_type"],"name": string,"protein_g": number | null,"quantity": number,"saved_food_id": string | null,"unit": string,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "calories": number,"carbs_g"?: number | null,"created_at"?: string,"fat_g"?: number | null,"id"?: string,"logged_on": string,"meal_type": Database["public"]['Enums']["meal_type"],"name": string,"protein_g"?: number | null,"quantity": number,"saved_food_id"?: string | null,"unit": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "calories"?: number,"carbs_g"?: number | null,"created_at"?: string,"fat_g"?: number | null,"id"?: string,"logged_on"?: string,"meal_type"?: Database["public"]['Enums']["meal_type"],"name"?: string,"protein_g"?: number | null,"quantity"?: number,"saved_food_id"?: string | null,"unit"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "food_entries_saved_food_id_user_id_fkey"
      columns: ["saved_food_id","user_id"]
isOneToOne: false
      referencedRelation: "saved_foods"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"daily_calorie_goal": number,"daily_water_goal_ml": number,"default_rest_seconds": number,"display_name": string | null,"id": string,"onboarded_at": string | null,"timezone": string,"units": Database["public"]['Enums']["unit_system"],"updated_at": string,"water_quick_adds": (number)[]
                  }
                  Insert: {
                    "created_at"?: string,"daily_calorie_goal"?: number,"daily_water_goal_ml"?: number,"default_rest_seconds"?: number,"display_name"?: string | null,"id": string,"onboarded_at"?: string | null,"timezone"?: string,"units"?: Database["public"]['Enums']["unit_system"],"updated_at"?: string,"water_quick_adds"?: (number)[]
                  }
                  Update: {
                    "created_at"?: string,"daily_calorie_goal"?: number,"daily_water_goal_ml"?: number,"default_rest_seconds"?: number,"display_name"?: string | null,"id"?: string,"onboarded_at"?: string | null,"timezone"?: string,"units"?: Database["public"]['Enums']["unit_system"],"updated_at"?: string,"water_quick_adds"?: (number)[]
                  }
                  Relationships: [
                    
                  ]
                },"saved_foods": {
                  Row: {
                    "calories": number,"carbs_g": number | null,"created_at": string,"default_quantity": number,"default_unit": string,"fat_g": number | null,"id": string,"last_used_at": string | null,"name": string,"protein_g": number | null,"updated_at": string,"use_count": number,"user_id": string
                  }
                  Insert: {
                    "calories": number,"carbs_g"?: number | null,"created_at"?: string,"default_quantity": number,"default_unit": string,"fat_g"?: number | null,"id"?: string,"last_used_at"?: string | null,"name": string,"protein_g"?: number | null,"updated_at"?: string,"use_count"?: number,"user_id"?: string
                  }
                  Update: {
                    "calories"?: number,"carbs_g"?: number | null,"created_at"?: string,"default_quantity"?: number,"default_unit"?: string,"fat_g"?: number | null,"id"?: string,"last_used_at"?: string | null,"name"?: string,"protein_g"?: number | null,"updated_at"?: string,"use_count"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"template_exercises": {
                  Row: {
                    "created_at": string,"exercise_id": string,"id": string,"notes": string | null,"position": number,"target_reps": number | null,"target_sets": number | null,"template_id": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"exercise_id": string,"id"?: string,"notes"?: string | null,"position": number,"target_reps"?: number | null,"target_sets"?: number | null,"template_id": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"exercise_id"?: string,"id"?: string,"notes"?: string | null,"position"?: number,"target_reps"?: number | null,"target_sets"?: number | null,"template_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "template_exercises_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "template_exercises_template_id_user_id_fkey"
      columns: ["template_id","user_id"]
isOneToOne: false
      referencedRelation: "workout_templates"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"water_logs": {
                  Row: {
                    "amount_ml": number,"created_at": string,"id": string,"logged_at": string,"logged_on": string,"user_id": string
                  }
                  Insert: {
                    "amount_ml": number,"created_at"?: string,"id"?: string,"logged_at"?: string,"logged_on": string,"user_id"?: string
                  }
                  Update: {
                    "amount_ml"?: number,"created_at"?: string,"id"?: string,"logged_at"?: string,"logged_on"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"workout_exercises": {
                  Row: {
                    "created_at": string,"exercise_id": string,"id": string,"notes": string | null,"position": number,"updated_at": string,"user_id": string,"workout_id": string
                  }
                  Insert: {
                    "created_at"?: string,"exercise_id": string,"id"?: string,"notes"?: string | null,"position": number,"updated_at"?: string,"user_id"?: string,"workout_id": string
                  }
                  Update: {
                    "created_at"?: string,"exercise_id"?: string,"id"?: string,"notes"?: string | null,"position"?: number,"updated_at"?: string,"user_id"?: string,"workout_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workout_exercises_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workout_exercises_workout_id_user_id_fkey"
      columns: ["workout_id","user_id"]
isOneToOne: false
      referencedRelation: "workouts"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"workout_sets": {
                  Row: {
                    "completed_at": string | null,"created_at": string,"distance_m": number | null,"duration_seconds": number | null,"id": string,"is_completed": boolean,"is_warmup": boolean,"position": number,"reps": number | null,"updated_at": string,"user_id": string,"weight_kg": number | null,"workout_exercise_id": string
                  }
                  Insert: {
                    "completed_at"?: string | null,"created_at"?: string,"distance_m"?: number | null,"duration_seconds"?: number | null,"id"?: string,"is_completed"?: boolean,"is_warmup"?: boolean,"position": number,"reps"?: number | null,"updated_at"?: string,"user_id"?: string,"weight_kg"?: number | null,"workout_exercise_id": string
                  }
                  Update: {
                    "completed_at"?: string | null,"created_at"?: string,"distance_m"?: number | null,"duration_seconds"?: number | null,"id"?: string,"is_completed"?: boolean,"is_warmup"?: boolean,"position"?: number,"reps"?: number | null,"updated_at"?: string,"user_id"?: string,"weight_kg"?: number | null,"workout_exercise_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workout_sets_workout_exercise_id_user_id_fkey"
      columns: ["workout_exercise_id","user_id"]
isOneToOne: false
      referencedRelation: "workout_exercises"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"workout_templates": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"notes": string | null,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"notes"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"notes"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"workouts": {
                  Row: {
                    "created_at": string,"ended_at": string | null,"id": string,"name": string,"notes": string | null,"revision": number,"started_at": string,"template_id": string | null,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"ended_at"?: string | null,"id"?: string,"name"?: string,"notes"?: string | null,"revision"?: number,"started_at"?: string,"template_id"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"ended_at"?: string | null,"id"?: string,"name"?: string,"notes"?: string | null,"revision"?: number,"started_at"?: string,"template_id"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workouts_template_id_user_id_fkey"
      columns: ["template_id","user_id"]
isOneToOne: false
      referencedRelation: "workout_templates"
      referencedColumns: ["id","user_id"]
    }
                  ]
                }
          }
          Views: {
            "completed_sets": {
                  Row: {
                    "distance_m": number | null,"duration_seconds": number | null,"e1rm": number | null,"exercise_id": string | null,"reps": number | null,"set_id": string | null,"started_at": string | null,"user_id": string | null,"volume_kg": number | null,"weight_kg": number | null,"workout_id": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "workout_exercises_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "copy_food_entries":
{ Args: { "p_from": string,"p_meal_type"?: Database["public"]['Enums']["meal_type"],"p_to": string }; Returns: number
                           },
"epley_1rm":
{ Args: { "reps": number,"weight_kg": number }; Returns: number
                           },
"exercise_history":
{ Args: { "p_exercise_id": string }; Returns: {
              "best_e1rm": number,"max_distance_m": number,"max_duration_seconds": number,"performed_at": string,"set_count": number,"top_weight_kg": number,"total_reps": number,"total_volume_kg": number,"workout_id": string
            }[]
                           },
"exercise_prs":
{ Args: { "p_exercise_id": string }; Returns: {
              "achieved_at": string,"kind": string,"value": number,"workout_id": string
            }[]
                           },
"is_valid_timezone":
{ Args: { "tz": string }; Returns: boolean
                           },
"last_performance":
{ Args: { "p_exercise_ids": (string)[] }; Returns: {
              "distance_m": number,"duration_seconds": number,"exercise_id": string,"is_warmup": boolean,"performed_at": string,"position": number,"reps": number,"weight_kg": number
            }[]
                           },
"recent_foods":
{ Args: { "p_limit"?: number }; Returns: {
              "calories": number,"carbs_g": number,"fat_g": number,"last_logged_at": string,"name": string,"protein_g": number,"quantity": number,"saved_food_id": string,"unit": string
            }[]
                           },
"save_workout":
{ Args: { "p_workout": Json }; Returns: string
                           },
"weekly_summaries":
{ Args: { "p_from": string,"p_to": string }; Returns: {
              "avg_calories": number,"avg_water_ml": number,"week_start": string,"workouts_completed": number
            }[]
                           },
"workout_days":
{ Args: { "p_from": string,"p_to": string }; Returns: {
              "day": string,"workout_count": number
            }[]
                           },
"workout_prs":
{ Args: { "p_workout_id": string }; Returns: {
              "exercise_id": string,"kind": string,"previous_best": number,"value": number
            }[]
                           }
          }
          Enums: {
            "equipment": "barbell"|"dumbbell"|"machine"|"cable"|"kettlebell"|"bodyweight"|"band"|"other","exercise_category": "strength"|"cardio"|"mobility"|"other","meal_type": "breakfast"|"lunch"|"dinner"|"snack","muscle_group": "chest"|"back"|"shoulders"|"biceps"|"triceps"|"forearms"|"core"|"quads"|"hamstrings"|"glutes"|"calves"|"full_body"|"cardio"|"other","tracking_type": "weight_reps"|"reps"|"duration"|"distance_duration","unit_system": "metric"|"imperial"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "equipment": ["barbell", "dumbbell", "machine", "cable", "kettlebell", "bodyweight", "band", "other"],"exercise_category": ["strength", "cardio", "mobility", "other"],"meal_type": ["breakfast", "lunch", "dinner", "snack"],"muscle_group": ["chest", "back", "shoulders", "biceps", "triceps", "forearms", "core", "quads", "hamstrings", "glutes", "calves", "full_body", "cardio", "other"],"tracking_type": ["weight_reps", "reps", "duration", "distance_duration"],"unit_system": ["metric", "imperial"]
          }
        }
} as const

