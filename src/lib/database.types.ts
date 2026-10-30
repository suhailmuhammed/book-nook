// ============================================================
// Database Types for Book Nook
// Auto-generated structure matching the Supabase schema.
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type BookStatus = 'Available' | 'Borrowed' | 'Reserved' | 'Lost' | 'Under Repair'
export type BookCondition = 'Excellent' | 'Good' | 'Fair' | 'Poor'
export type MetadataSource = 'manual' | 'google_books' | 'import'
export type RequestStatus = 'Waiting' | 'Ready for Pickup' | 'Fulfilled' | 'Cancelled' | 'Expired'

export interface Database {
  public: {
    Tables: {
      books: {
        Row: {
          id: string
          book_code: string
          title: string
          author: string | null
          category: string | null
          isbn: string | null
          publisher: string | null
          published_year: number | null
          edition: string | null
          language: string | null
          page_count: number | null
          description: string | null
          owned_by: string | null
          shelf_number: string | null
          date_added: string
          status: BookStatus
          condition: BookCondition
          cover_image_url: string | null
          google_books_volume_id: string | null
          metadata_source: MetadataSource | null
          metadata_updated_at: string | null
          created_at: string
          updated_at: string
          archived_at: string | null
          is_demo?: boolean
        }
        Insert: {
          id?: string
          book_code: string
          title: string
          author?: string | null
          category?: string | null
          isbn?: string | null
          publisher?: string | null
          published_year?: number | null
          edition?: string | null
          language?: string | null
          page_count?: number | null
          description?: string | null
          owned_by?: string | null
          shelf_number?: string | null
          date_added?: string
          status?: BookStatus
          condition?: BookCondition
          cover_image_url?: string | null
          google_books_volume_id?: string | null
          metadata_source?: MetadataSource | null
          metadata_updated_at?: string | null
          created_at?: string
          updated_at?: string
          archived_at?: string | null
          is_demo?: boolean
        }
        Update: {
          id?: string
          book_code?: string
          title?: string
          author?: string | null
          category?: string | null
          isbn?: string | null
          publisher?: string | null
          published_year?: number | null
          edition?: string | null
          language?: string | null
          page_count?: number | null
          description?: string | null
          owned_by?: string | null
          shelf_number?: string | null
          date_added?: string
          status?: BookStatus
          condition?: BookCondition
          cover_image_url?: string | null
          google_books_volume_id?: string | null
          metadata_source?: MetadataSource | null
          metadata_updated_at?: string | null
          updated_at?: string
          archived_at?: string | null
          is_demo?: boolean
        }
      }
      employees: {
        Row: {
          id: string
          employee_code: string | null
          full_name: string
          department: string | null
          email: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          archived_at: string | null
        }
        Insert: {
          id?: string
          employee_code?: string | null
          full_name: string
          department?: string | null
          email?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
        Update: {
          id?: string
          employee_code?: string | null
          full_name?: string
          department?: string | null
          email?: string | null
          is_active?: boolean
          updated_at?: string
          archived_at?: string | null
        }
      }
      borrowings: {
        Row: {
          id: string
          book_id: string
          employee_id: string
          request_id: string | null
          issue_date: string
          due_date: string
          return_date: string | null
          issue_remarks: string | null
          return_remarks: string | null
          return_condition: BookCondition | null
          created_by: string | null
          created_at: string
          updated_at: string
          is_demo?: boolean
        }
        Insert: {
          id?: string
          book_id: string
          employee_id: string
          request_id?: string | null
          issue_date?: string
          due_date: string
          return_date?: string | null
          issue_remarks?: string | null
          return_remarks?: string | null
          return_condition?: BookCondition | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          is_demo?: boolean
        }
        Update: {
          id?: string
          book_id?: string
          employee_id?: string
          request_id?: string | null
          issue_date?: string
          due_date?: string
          return_date?: string | null
          issue_remarks?: string | null
          return_remarks?: string | null
          return_condition?: BookCondition | null
          updated_at?: string
          is_demo?: boolean
        }
      }
      reviews: {
        Row: {
          id: string
          book_id: string
          employee_id: string
          rating: number
          comment: string | null
          review_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          book_id: string
          employee_id: string
          rating: number
          comment?: string | null
          review_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          book_id?: string
          employee_id?: string
          rating?: number
          comment?: string | null
          review_date?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          actor_user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          actor_user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          details?: Json
          created_at?: string
        }
        Update: never
      }
      app_settings: {
        Row: {
          id: number
          library_name: string
          default_loan_days: number
          business_timezone: string
          date_format: string
          contact_info: string | null
          google_books_api_key: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          library_name?: string
          default_loan_days?: number
          business_timezone?: string
          date_format?: string
          contact_info?: string | null
          google_books_api_key?: string | null
          updated_at?: string
        }
        Update: {
          library_name?: string
          default_loan_days?: number
          business_timezone?: string
          date_format?: string
          contact_info?: string | null
          google_books_api_key?: string | null
          updated_at?: string
        }
      }
      book_requests: {
        Row: {
          id: string
          book_id: string
          employee_id: string
          status: RequestStatus
          queue_position: number
          request_date: string
          notified_at: string | null
          notes: string | null
          is_demo?: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          book_id: string
          employee_id: string
          status?: RequestStatus
          queue_position?: number
          request_date?: string
          notified_at?: string | null
          notes?: string | null
          is_demo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          book_id?: string
          employee_id?: string
          status?: RequestStatus
          queue_position?: number
          request_date?: string
          notified_at?: string | null
          notes?: string | null
          is_demo?: boolean
          updated_at?: string
        }
      }
      queue_audit_logs: {
        Row: {
          id: string
          book_id: string
          request_id: string | null
          employee_id: string | null
          action: string
          prev_position: number | null
          new_position: number | null
          reason: string | null
          performed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          book_id: string
          request_id?: string | null
          employee_id?: string | null
          action: string
          prev_position?: number | null
          new_position?: number | null
          reason?: string | null
          performed_by?: string | null
          created_at?: string
        }
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: {
      generate_book_code: {
        Args: Record<string, never>
        Returns: string
      }
      generate_employee_code: {
        Args: Record<string, never>
        Returns: string
      }
      issue_book: {
        Args: {
          p_book_id: string
          p_employee_id: string
          p_issue_date: string
          p_due_date: string
          p_remarks: string | null
          p_actor_user_id: string
          p_request_id?: string | null
        }
        Returns: string
      }
      return_book: {
        Args: {
          p_borrowing_id: string
          p_return_date: string
          p_return_remarks: string | null
          p_return_condition: string | null
          p_actor_user_id: string
        }
        Returns: void
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience row types
export type Book = Database['public']['Tables']['books']['Row']
export type BookInsert = Database['public']['Tables']['books']['Insert']
export type BookUpdate = Database['public']['Tables']['books']['Update']

export type Employee = Database['public']['Tables']['employees']['Row']
export type EmployeeInsert = Database['public']['Tables']['employees']['Insert']
export type EmployeeUpdate = Database['public']['Tables']['employees']['Update']

export type Borrowing = Database['public']['Tables']['borrowings']['Row']
export type BorrowingInsert = Database['public']['Tables']['borrowings']['Insert']
export type BorrowingUpdate = Database['public']['Tables']['borrowings']['Update']

export type Review = Database['public']['Tables']['reviews']['Row']
export type ReviewInsert = Database['public']['Tables']['reviews']['Insert']
export type ReviewUpdate = Database['public']['Tables']['reviews']['Update']

export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
export type AppSettings = Database['public']['Tables']['app_settings']['Row']
export type AppSettingsUpdate = Database['public']['Tables']['app_settings']['Update']

export type BookRequest = Database['public']['Tables']['book_requests']['Row']
export type BookRequestInsert = Database['public']['Tables']['book_requests']['Insert']
export type BookRequestUpdate = Database['public']['Tables']['book_requests']['Update']

export type QueueAuditLog = Database['public']['Tables']['queue_audit_logs']['Row']
export type QueueAuditLogInsert = Database['public']['Tables']['queue_audit_logs']['Insert']

// Joined types for common queries
export type BorrowingWithDetails = Borrowing & {
  book: Pick<Book, 'id' | 'book_code' | 'title' | 'cover_image_url' | 'status'>
  employee: Pick<Employee, 'id' | 'full_name' | 'department' | 'employee_code'>
}

export type BookRequestWithDetails = BookRequest & {
  book: Pick<Book, 'id' | 'book_code' | 'title' | 'cover_image_url' | 'status' | 'condition'>
  employee: Pick<Employee, 'id' | 'full_name' | 'department' | 'employee_code'>
}

export type BookWithStats = Book & {
  active_borrowing?: BorrowingWithDetails | null
  review_count?: number
  average_rating?: number
  waiting_count?: number
}
