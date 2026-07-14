// Hand-written to match the live Supabase schema as of the Phase 0 audit
// (docs/BEHAVIOR.md). Replace with `supabase gen types typescript` output
// once the CLI is available — keep the same `Database` shape so nothing
// downstream breaks. `Relationships`/`Views`/`Functions` are required by
// @supabase/postgrest-js's `GenericSchema` constraint even though this repo
// doesn't use typed embeds — see node_modules/@supabase/postgrest-js/src/types/common/common.ts.

export interface Database {
  public: {
    Tables: {
      admins: {
        Row: {
          id: number;
          username: string;
          pin: string;
        };
        Insert: {
          id?: number;
          username: string;
          pin: string;
        };
        Update: {
          id?: number;
          username?: string;
          pin?: string;
        };
        Relationships: [];
      };
      vehicles: {
        Row: {
          id: number;
          plate_number: string;
          driver_name: string;
          pin: string;
          status: string;
        };
        Insert: {
          id?: number;
          plate_number: string;
          driver_name: string;
          pin: string;
          status: string;
        };
        Update: {
          id?: number;
          plate_number?: string;
          driver_name?: string;
          pin?: string;
          status?: string;
        };
        Relationships: [];
      };
      students: {
        Row: {
          id: number;
          name: string;
          parent_phone: string;
          vehicle_id: number;
          status: string | null;
        };
        Insert: {
          id?: number;
          name: string;
          parent_phone: string;
          vehicle_id: number;
          status?: string | null;
        };
        Update: {
          id?: number;
          name?: string;
          parent_phone?: string;
          vehicle_id?: number;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "students_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      rides: {
        Row: {
          vehicle_id: number;
          current_lat: number;
          current_lng: number;
          speed: number;
          updated_at: string;
        };
        Insert: {
          vehicle_id: number;
          current_lat: number;
          current_lng: number;
          speed: number;
          updated_at: string;
        };
        Update: {
          vehicle_id?: number;
          current_lat?: number;
          current_lng?: number;
          speed?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rides_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: true;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          role: string | null;
        };
        Insert: {
          id: string;
          role?: string | null;
        };
        Update: {
          id?: string;
          role?: string | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
  };
}
