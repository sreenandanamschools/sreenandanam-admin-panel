// ─── Supabase Schema Types ────────────────────────────────────────────────────
// Auto-derived from the public schema — keep in sync with Supabase migrations.

export interface AcademicYear {
  id: string
  name: string
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
}

export interface Class {
  id: string
  class_name: string
  section: string | null
  created_at: string
}

export interface Student {
  id: string
  admission_no: string
  full_name: string
  class_id: string | null
  academic_year_id: string | null
  parent_name: string | null
  phone: string | null
  email: string | null
  is_active: boolean
  created_at: string
  image_url?: string | null
  date_of_birth?: string | null
  gender?: string | null
  blood_group?: string | null
  address?: string | null
  emergency_contact?: string | null
  // Joined
  classes?: Class | null
  academic_years?: AcademicYear | null
  student_enrollments?: any[] | null
}

export interface StudentEnrollment {
  id: string
  student_id: string
  academic_year_id: string
  class_id: string
  roll_no: string | null
  section: string | null
  status: string
  joined_on: string
  promoted_from_enrollment_id: string | null
  remarks: string | null
  created_at: string
  // Joined
  students?: Student | null
  academic_years?: AcademicYear | null
  classes?: Class | null
}

export interface Teacher {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  subject: string
  join_date: string
  created_at: string
  image_url?: string | null
  date_of_birth?: string | null
  gender?: string | null
  address?: string | null
  qualification?: string | null
  experience_years?: number | null
}

export interface Attendance {
  id: string
  student_id: string
  date: string
  status: 'Present' | 'Absent' | 'Late' | 'Half-day'
  remarks: string | null
  created_at: string
}

export interface Exam {
  id: string
  name: string
  class_id: string
  subject: string
  exam_date: string
  total_marks: number
  passing_marks: number
  created_at: string
  // Joined
  classes?: Class | null
}

export interface FeeStructure {
  id: string
  name: string
  academic_year_id: string | null
  created_at: string
  academic_years?: AcademicYear | null
  fee_components?: FeeComponent[]
}

export interface FeeComponent {
  id: string
  fee_structure_id: string | null
  component_name: string
  amount: number
  frequency: 'monthly' | 'term' | 'yearly' | 'one_time'
  created_at: string
}

export interface StudentFeeAssignment {
  id: string
  student_id: string | null
  fee_structure_id: string | null
  discount_amount: number
  assigned_at: string
  students?: Student | null
  fee_structures?: FeeStructure | null
}

export interface FeeInstallment {
  id: string
  student_fee_assignment_id: string | null
  installment_name: string
  due_date: string
  amount: number
  status: 'pending' | 'partial' | 'paid' | 'overdue'
  created_at: string
}

export interface Payment {
  id: string
  student_id: string | null
  installment_id: string | null
  amount_paid: number
  payment_method: 'cash' | 'upi' | 'bank_transfer' | 'card' | null
  transaction_ref: string | null
  paid_at: string
  received_by: string | null
  students?: Student | null
  fee_installments?: FeeInstallment | null
}

export interface Receipt {
  id: string
  payment_id: string | null
  receipt_no: string
  pdf_url: string | null
  created_at: string
}

export interface Announcement {
  id: string
  title: string
  content: string
  target_audience: string
  published_date: string
  created_by: string | null
  created_at: string
  type: 'event' | 'announcement'
}

export interface Book {
  id: string
  title: string
  author: string
  isbn: string | null
  total_copies: number
  available_copies: number
  status: 'Available' | 'Out of Stock'
  created_at: string
}

export interface GalleryItem {
  id: string
  title: string
  category: string
  image_url: string
  uploaded_by: string | null
  created_at: string
}

export interface News {
  id: string
  title: string
  category: 'Admissions' | 'Events' | 'Notice' | 'Announcement'
  excerpt: string
  is_new: boolean
  is_pinned: boolean
  published_at: string
  created_at: string
}

export interface SchoolEvent {
  id: string
  title: string
  event_date: string
  event_time: string
  location: string
  description: string | null
  created_at: string
}

export interface Career {
  id: string
  name: string
  email: string
  phone: string
  position: string
  cover_letter: string | null
  resume_url: string
  created_at: string
}

export interface FamousVisitor {
  id: string
  name: string
  designation: string
  description: string | null
  image_url: string | null
  visited_at: string
  created_at: string
}
