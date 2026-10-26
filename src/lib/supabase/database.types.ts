// Generated from the local schema. Run npm run db:types after migrations.
export type Json = string | number | boolean | null | {
    [key: string]: Json | undefined;
} | Json[];
export type Database = {
    "public": {
        Tables: {
            "alerts": {
                Row: {
                    "alert_type": Database["public"]['Enums']["alert_type"];
                    "created_at": string;
                    "id": string;
                    "incident_id": string;
                    "resolved_at": string | null;
                    "severity": Database["public"]['Enums']["alert_severity"];
                };
                ComputedFields: never;
                Insert: {
                    "alert_type": Database["public"]['Enums']["alert_type"];
                    "created_at"?: string;
                    "id"?: string;
                    "incident_id": string;
                    "resolved_at"?: string | null;
                    "severity"?: Database["public"]['Enums']["alert_severity"];
                };
                Update: {
                    "alert_type"?: Database["public"]['Enums']["alert_type"];
                    "created_at"?: string;
                    "id"?: string;
                    "incident_id"?: string;
                    "resolved_at"?: string | null;
                    "severity"?: Database["public"]['Enums']["alert_severity"];
                };
                Relationships: [
                    {
                        foreignKeyName: "alerts_incident_id_fkey";
                        columns: [
                            "incident_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "incidents";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "buildings": {
                Row: {
                    "address": string;
                    "created_at": string;
                    "id": string;
                    "management_company": string | null;
                    "name": string;
                    "timezone": string;
                    "updated_at": string;
                };
                ComputedFields: never;
                Insert: {
                    "address": string;
                    "created_at"?: string;
                    "id"?: string;
                    "management_company"?: string | null;
                    "name": string;
                    "timezone"?: string;
                    "updated_at"?: string;
                };
                Update: {
                    "address"?: string;
                    "created_at"?: string;
                    "id"?: string;
                    "management_company"?: string | null;
                    "name"?: string;
                    "timezone"?: string;
                    "updated_at"?: string;
                };
                Relationships: [
                ];
            };
            "follows": {
                Row: {
                    "created_at": string;
                    "id": string;
                    "incident_id": string;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "id"?: string;
                    "incident_id": string;
                    "user_id": string;
                };
                Update: {
                    "created_at"?: string;
                    "id"?: string;
                    "incident_id"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "follows_incident_id_fkey";
                        columns: [
                            "incident_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "incidents";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "follows_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "incidents": {
                Row: {
                    "building_id": string;
                    "category": string | null;
                    "created_at": string;
                    "created_by": string | null;
                    "description": string;
                    "expected_resolution_at": string | null;
                    "first_reported_at": string;
                    "id": string;
                    "last_management_update_at": string | null;
                    "last_report_at": string;
                    "location": string | null;
                    "resolved_at": string | null;
                    "status": Database["public"]['Enums']["incident_status"];
                    "title": string;
                    "updated_at": string;
                };
                ComputedFields: never;
                Insert: {
                    "building_id": string;
                    "category"?: string | null;
                    "created_at"?: string;
                    "created_by"?: string | null;
                    "description"?: string;
                    "expected_resolution_at"?: string | null;
                    "first_reported_at"?: string;
                    "id"?: string;
                    "last_management_update_at"?: string | null;
                    "last_report_at"?: string;
                    "location"?: string | null;
                    "resolved_at"?: string | null;
                    "status"?: Database["public"]['Enums']["incident_status"];
                    "title": string;
                    "updated_at"?: string;
                };
                Update: {
                    "building_id"?: string;
                    "category"?: string | null;
                    "created_at"?: string;
                    "created_by"?: string | null;
                    "description"?: string;
                    "expected_resolution_at"?: string | null;
                    "first_reported_at"?: string;
                    "id"?: string;
                    "last_management_update_at"?: string | null;
                    "last_report_at"?: string;
                    "location"?: string | null;
                    "resolved_at"?: string | null;
                    "status"?: Database["public"]['Enums']["incident_status"];
                    "title"?: string;
                    "updated_at"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "incidents_building_id_fkey";
                        columns: [
                            "building_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "buildings";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "incidents_created_by_fkey";
                        columns: [
                            "created_by"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "legacy_tickets": {
                Row: {
                    "created_at": string;
                    "date_is_approximate": boolean;
                    "id": string;
                    "incident_id": string;
                    "management_status": string | null;
                    "resident_id": string;
                    "resident_topic": string | null;
                    "source_quality": Database["public"]['Enums']["ticket_source_quality"];
                    "submitted_at": string | null;
                    "ticket_number": string | null;
                    "ticket_title": string | null;
                    "updated_at": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "date_is_approximate"?: boolean;
                    "id"?: string;
                    "incident_id": string;
                    "management_status"?: string | null;
                    "resident_id": string;
                    "resident_topic"?: string | null;
                    "source_quality"?: Database["public"]['Enums']["ticket_source_quality"];
                    "submitted_at"?: string | null;
                    "ticket_number"?: string | null;
                    "ticket_title"?: string | null;
                    "updated_at"?: string;
                };
                Update: {
                    "created_at"?: string;
                    "date_is_approximate"?: boolean;
                    "id"?: string;
                    "incident_id"?: string;
                    "management_status"?: string | null;
                    "resident_id"?: string;
                    "resident_topic"?: string | null;
                    "source_quality"?: Database["public"]['Enums']["ticket_source_quality"];
                    "submitted_at"?: string | null;
                    "ticket_number"?: string | null;
                    "ticket_title"?: string | null;
                    "updated_at"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "legacy_tickets_incident_id_fkey";
                        columns: [
                            "incident_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "incidents";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "legacy_tickets_resident_id_fkey";
                        columns: [
                            "resident_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "management_buildings": {
                Row: {
                    "building_id": string;
                    "created_at": string;
                    "id": string;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "building_id": string;
                    "created_at"?: string;
                    "id"?: string;
                    "user_id": string;
                };
                Update: {
                    "building_id"?: string;
                    "created_at"?: string;
                    "id"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "management_buildings_building_id_fkey";
                        columns: [
                            "building_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "buildings";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "management_buildings_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "management_updates": {
                Row: {
                    "created_at": string;
                    "created_by": string | null;
                    "expected_resolution_at": string | null;
                    "id": string;
                    "incident_id": string;
                    "message": string;
                    "status": Database["public"]['Enums']["incident_status"];
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "created_by"?: string | null;
                    "expected_resolution_at"?: string | null;
                    "id"?: string;
                    "incident_id": string;
                    "message": string;
                    "status": Database["public"]['Enums']["incident_status"];
                };
                Update: {
                    "created_at"?: string;
                    "created_by"?: string | null;
                    "expected_resolution_at"?: string | null;
                    "id"?: string;
                    "incident_id"?: string;
                    "message"?: string;
                    "status"?: Database["public"]['Enums']["incident_status"];
                };
                Relationships: [
                    {
                        foreignKeyName: "management_updates_created_by_fkey";
                        columns: [
                            "created_by"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "management_updates_incident_id_fkey";
                        columns: [
                            "incident_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "incidents";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "profiles": {
                Row: {
                    "created_at": string;
                    "display_name": string | null;
                    "email": string | null;
                    "id": string;
                    "role": Database["public"]['Enums']["app_role"];
                    "updated_at": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "display_name"?: string | null;
                    "email"?: string | null;
                    "id": string;
                    "role"?: Database["public"]['Enums']["app_role"];
                    "updated_at"?: string;
                };
                Update: {
                    "created_at"?: string;
                    "display_name"?: string | null;
                    "email"?: string | null;
                    "id"?: string;
                    "role"?: Database["public"]['Enums']["app_role"];
                    "updated_at"?: string;
                };
                Relationships: [
                ];
            };
            "reports": {
                Row: {
                    "created_at": string;
                    "id": string;
                    "incident_id": string;
                    "location": string | null;
                    "resident_id": string;
                    "source": Database["public"]['Enums']["report_source"];
                    "text": string;
                    "updated_at": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "id"?: string;
                    "incident_id": string;
                    "location"?: string | null;
                    "resident_id": string;
                    "source"?: Database["public"]['Enums']["report_source"];
                    "text": string;
                    "updated_at"?: string;
                };
                Update: {
                    "created_at"?: string;
                    "id"?: string;
                    "incident_id"?: string;
                    "location"?: string | null;
                    "resident_id"?: string;
                    "source"?: Database["public"]['Enums']["report_source"];
                    "text"?: string;
                    "updated_at"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "reports_incident_id_fkey";
                        columns: [
                            "incident_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "incidents";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "reports_resident_id_fkey";
                        columns: [
                            "resident_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "resident_memberships": {
                Row: {
                    "building_id": string;
                    "created_at": string;
                    "id": string;
                    "is_active": boolean;
                    "unit_id": string | null;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "building_id": string;
                    "created_at"?: string;
                    "id"?: string;
                    "is_active"?: boolean;
                    "unit_id"?: string | null;
                    "user_id": string;
                };
                Update: {
                    "building_id"?: string;
                    "created_at"?: string;
                    "id"?: string;
                    "is_active"?: boolean;
                    "unit_id"?: string | null;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "resident_memberships_building_id_fkey";
                        columns: [
                            "building_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "buildings";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "resident_memberships_building_id_unit_id_fkey";
                        columns: [
                            "building_id",
                            "unit_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "units";
                        referencedColumns: [
                            "building_id",
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "resident_memberships_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "units": {
                Row: {
                    "building_id": string;
                    "created_at": string;
                    "id": string;
                    "unit_number": string;
                    "updated_at": string;
                };
                ComputedFields: never;
                Insert: {
                    "building_id": string;
                    "created_at"?: string;
                    "id"?: string;
                    "unit_number": string;
                    "updated_at"?: string;
                };
                Update: {
                    "building_id"?: string;
                    "created_at"?: string;
                    "id"?: string;
                    "unit_number"?: string;
                    "updated_at"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "units_building_id_fkey";
                        columns: [
                            "building_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "buildings";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "update_requests": {
                Row: {
                    "created_at": string;
                    "id": string;
                    "incident_id": string;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "id"?: string;
                    "incident_id": string;
                    "user_id": string;
                };
                Update: {
                    "created_at"?: string;
                    "id"?: string;
                    "incident_id"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "update_requests_incident_id_fkey";
                        columns: [
                            "incident_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "incidents";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "update_requests_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            "submit_resident_report": {
                Args: {
                    "p_category"?: string;
                    "p_location"?: string;
                    "p_text": string;
                    "p_title": string;
                };
                Returns: string;
            };
        };
        Enums: {
            "alert_severity": "info" | "warning" | "critical";
            "alert_type": "no_update" | "deadline_approaching" | "deadline_overdue" | "stuck_status";
            "app_role": "resident" | "management" | "admin";
            "incident_status": "reported" | "acknowledged" | "in_progress" | "waiting_for_contractor" | "scheduled" | "resolved";
            "report_source": "app" | "legacy" | "admin";
            "ticket_source_quality": "verified_ticket" | "partial_ticket" | "resident_recollection";
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};
type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];
export type Tables<DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | {
    schema: keyof DatabaseWithoutInternals;
}, TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"]) : never = never> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
    Row: infer R;
} ? R : never : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
    Row: infer R;
} ? R : never : never;
export type TablesInsert<DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | {
    schema: keyof DatabaseWithoutInternals;
}, TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] : never = never> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I;
} ? I : never : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I;
} ? I : never : never;
export type TablesUpdate<DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | {
    schema: keyof DatabaseWithoutInternals;
}, TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] : never = never> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U;
} ? U : never : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U;
} ? U : never : never;
export type Enums<DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | {
    schema: keyof DatabaseWithoutInternals;
}, EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"] : never = never> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName] : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions] : never;
export type CompositeTypes<PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | {
    schema: keyof DatabaseWithoutInternals;
}, CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"] : never = never> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName] : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions] : never;
export const Constants = {
    "public": {
        Enums: {
            "alert_severity": ["info", "warning", "critical"], "alert_type": ["no_update", "deadline_approaching", "deadline_overdue", "stuck_status"], "app_role": ["resident", "management", "admin"], "incident_status": ["reported", "acknowledged", "in_progress", "waiting_for_contractor", "scheduled", "resolved"], "report_source": ["app", "legacy", "admin"], "ticket_source_quality": ["verified_ticket", "partial_ticket", "resident_recollection"]
        }
    }
} as const;
