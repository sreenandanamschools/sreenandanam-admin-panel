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
  parent_name: string | null
  phone: string | null
  email: string | null
  is_active: boolean
  created_at: string
  image_url: string | null
  date_of_birth: string | null
  gender: 'Male' | 'Female' | 'Other' | null
  blood_group: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null
  address: string | null
  emergency_contact: string | null
  updated_at: string | null
  admission_date: string | null
  // Joined
  student_enrollments?: StudentEnrollment[] | null
}

export interface StudentEnrollment {
  id: string
  student_id: string
  academic_year_id: string
  class_id: string
  roll_no: string | null
  section: string | null
  status: 'active' | 'promoted' | 'transferred' | 'left' | 'completed'
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
  image_url: string | null
  date_of_birth: string | null
  gender: string | null
  address: string | null
  qualification: string | null
  experience_years: number | null
  updated_at: string | null
  teacherid: string | null
}

export interface Attendance {
  id: string
  student_id: string
  date: string
  status: 'Present' | 'Absent' | 'Late' | 'Half-day'
  remarks: string | null
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
  updated_at: string | null
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
  updated_at: string | null
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
