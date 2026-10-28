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
                    "complex_id": string;
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
                    "complex_id": string;
                    "created_at"?: string;
                    "id"?: string;
                    "management_company"?: string | null;
                    "name": string;
                    "timezone"?: string;
                    "updated_at"?: string;
                };
                Update: {
                    "address"?: string;
                    "complex_id"?: string;
                    "created_at"?: string;
                    "id"?: string;
                    "management_company"?: string | null;
                    "name"?: string;
                    "timezone"?: string;
                    "updated_at"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "buildings_complex_id_fkey";
                        columns: [
                            "complex_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "complexes";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "complexes": {
                Row: {
                    "created_at": string;
                    "id": string;
                    "name": string;
                    "timezone": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "id"?: string;
                    "name": string;
                    "timezone"?: string;
                };
                Update: {
                    "created_at"?: string;
                    "id"?: string;
                    "name"?: string;
                    "timezone"?: string;
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
                    "building_id": string | null;
                    "category": string | null;
                    "category_detail": string | null;
                    "complex_id": string;
                    "created_at": string;
                    "created_by": string | null;
                    "description": string;
                    "expected_resolution_at": string | null;
                    "first_reported_at": string;
                    "id": string;
                    "last_management_update_at": string | null;
                    "last_report_at": string;
                    "location": string | null;
                    "location_id": string;
                    "request_kind": string;
                    "resolved_at": string | null;
                    "status": Database["public"]['Enums']["incident_status"];
                    "title": string;
                    "updated_at": string;
                };
                ComputedFields: never;
                Insert: {
                    "building_id"?: string | null;
                    "category"?: string | null;
                    "category_detail"?: string | null;
                    "complex_id": string;
                    "created_at"?: string;
                    "created_by"?: string | null;
                    "description"?: string;
                    "expected_resolution_at"?: string | null;
                    "first_reported_at"?: string;
                    "id"?: string;
                    "last_management_update_at"?: string | null;
                    "last_report_at"?: string;
                    "location"?: string | null;
                    "location_id": string;
                    "request_kind"?: string;
                    "resolved_at"?: string | null;
                    "status"?: Database["public"]['Enums']["incident_status"];
                    "title": string;
                    "updated_at"?: string;
                };
                Update: {
                    "building_id"?: string | null;
                    "category"?: string | null;
                    "category_detail"?: string | null;
                    "complex_id"?: string;
                    "created_at"?: string;
                    "created_by"?: string | null;
                    "description"?: string;
                    "expected_resolution_at"?: string | null;
                    "first_reported_at"?: string;
                    "id"?: string;
                    "last_management_update_at"?: string | null;
                    "last_report_at"?: string;
                    "location"?: string | null;
                    "location_id"?: string;
                    "request_kind"?: string;
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
                        foreignKeyName: "incidents_complex_id_fkey";
                        columns: [
                            "complex_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "complexes";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "incidents_complex_id_location_id_fkey";
                        columns: [
                            "complex_id",
                            "location_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "issue_locations";
                        referencedColumns: [
                            "complex_id",
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
            "issue_locations": {
                Row: {
                    "building_id": string | null;
                    "code": string;
                    "complex_id": string;
                    "created_at": string;
                    "id": string;
                    "name": string;
                };
                ComputedFields: never;
                Insert: {
                    "building_id"?: string | null;
                    "code": string;
                    "complex_id": string;
                    "created_at"?: string;
                    "id"?: string;
                    "name": string;
                };
                Update: {
                    "building_id"?: string | null;
                    "code"?: string;
                    "complex_id"?: string;
                    "created_at"?: string;
                    "id"?: string;
                    "name"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "issue_locations_building_id_fkey";
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
                        foreignKeyName: "issue_locations_complex_id_fkey";
                        columns: [
                            "complex_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "complexes";
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
            "report_attachments": {
                Row: {
                    "batch_id": string;
                    "byte_size": number;
                    "created_at": string;
                    "filename": string;
                    "id": string;
                    "mime_type": string;
                    "path": string;
                    "report_id": string | null;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "batch_id": string;
                    "byte_size": number;
                    "created_at"?: string;
                    "filename": string;
                    "id"?: string;
                    "mime_type": string;
                    "path": string;
                    "report_id"?: string | null;
                    "user_id": string;
                };
                Update: {
                    "batch_id"?: string;
                    "byte_size"?: number;
                    "created_at"?: string;
                    "filename"?: string;
                    "id"?: string;
                    "mime_type"?: string;
                    "path"?: string;
                    "report_id"?: string | null;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "report_attachments_batch_id_fkey";
                        columns: [
                            "batch_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "report_upload_batches";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "report_attachments_report_id_fkey";
                        columns: [
                            "report_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "reports";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "report_attachments_user_id_fkey";
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
            "report_upload_batches": {
                Row: {
                    "complex_id": string;
                    "created_at": string;
                    "expires_at": string;
                    "id": string;
                    "report_id": string | null;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "complex_id": string;
                    "created_at"?: string;
                    "expires_at"?: string;
                    "id": string;
                    "report_id"?: string | null;
                    "user_id": string;
                };
                Update: {
                    "complex_id"?: string;
                    "created_at"?: string;
                    "expires_at"?: string;
                    "id"?: string;
                    "report_id"?: string | null;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "report_upload_batches_complex_id_fkey";
                        columns: [
                            "complex_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "complexes";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "report_upload_batches_report_id_fkey";
                        columns: [
                            "report_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "reports";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "report_upload_batches_user_id_fkey";
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
            "reports": {
                Row: {
                    "created_at": string;
                    "id": string;
                    "incident_id": string;
                    "location": string | null;
                    "resident_id": string;
                    "source": Database["public"]['Enums']["report_source"];
                    "submission_id": string | null;
                    "text": string;
                    "unit_id": string | null;
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
                    "submission_id"?: string | null;
                    "text": string;
                    "unit_id"?: string | null;
                    "updated_at"?: string;
                };
                Update: {
                    "created_at"?: string;
                    "id"?: string;
                    "incident_id"?: string;
                    "location"?: string | null;
                    "resident_id"?: string;
                    "source"?: Database["public"]['Enums']["report_source"];
                    "submission_id"?: string | null;
                    "text"?: string;
                    "unit_id"?: string | null;
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
                    },
                    {
                        foreignKeyName: "reports_unit_id_fkey";
                        columns: [
                            "unit_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "units";
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
            "resident_status_observations": {
                Row: {
                    "created_at": string;
                    "detail": string | null;
                    "id": string;
                    "incident_id": string;
                    "report_id": string | null;
                    "status": string;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "detail"?: string | null;
                    "id"?: string;
                    "incident_id": string;
                    "report_id"?: string | null;
                    "status": string;
                    "user_id": string;
                };
                Update: {
                    "created_at"?: string;
                    "detail"?: string | null;
                    "id"?: string;
                    "incident_id"?: string;
                    "report_id"?: string | null;
                    "status"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "resident_status_observations_incident_id_fkey";
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
                        foreignKeyName: "resident_status_observations_report_id_fkey";
                        columns: [
                            "report_id"
                        ];
                        isOneToOne: true;
                        referencedRelation: "reports";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "resident_status_observations_user_id_fkey";
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
            "add_resident_status": {
                Args: {
                    "p_detail"?: string;
                    "p_incident": string;
                    "p_status": string;
                };
                Returns: undefined;
            };
            "cancel_report_attachment": {
                Args: {
                    "p_id": string;
                };
                Returns: undefined;
            };
            "find_similar_incidents": {
                Args: {
                    "p_category": string;
                    "p_category_detail"?: string;
                    "p_embedding": string;
                    "p_location": string;
                    "p_location_detail": string;
                    "p_request_kind": string;
                    "p_title": string;
                };
                Returns: {
                    "id": string;
                    "report_count": number;
                    "status": Database["public"]['Enums']["incident_status"];
                    "title": string;
                }[];
            };
            "get_complex_statistics": {
                Args: {
                    "p_complex": string;
                };
                Returns: Json;
            };
            "get_filtered_complex_statistics": {
                Args: {
                    "p_complex": string;
                    "p_filters": Json;
                };
                Returns: Json;
            };
            "get_issue_activity": {
                Args: {
                    "p_incident": string;
                };
                Returns: Json;
            };
            "get_resident_statuses": {
                Args: {
                    "p_complex": string;
                };
                Returns: Json;
            };
            "list_complex_incidents": {
                Args: {
                    "p_complex": string;
                };
                Returns: {
                    "building_name": string;
                    "category": string;
                    "category_detail": string;
                    "created_at": string;
                    "id": string;
                    "location_detail": string;
                    "location_name": string;
                    "report_count": number;
                    "reporting_households": number;
                    "request_kind": string;
                    "status": Database["public"]['Enums']["incident_status"];
                    "title": string;
                    "unknown_household_reports": number;
                }[];
            };
            "reserve_report_attachment": {
                Args: {
                    "p_batch": string;
                    "p_bytes": number;
                    "p_filename": string;
                    "p_location": string;
                    "p_mime": string;
                };
                Returns: Json;
            };
            "submit_complex_report": {
                Args: {
                    "p_data": Json;
                };
                Returns: Json;
            };
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
