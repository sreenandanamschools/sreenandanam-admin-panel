"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Edit2,
  Trash2,
  Plus,
  Search,
  Loader2,
  User,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Student, Class, AcademicYear } from "@/lib/supabase/types";
import {
  CSVImportDialog,
  type ColumnDef,
} from "@/components/csv-import-dialog";

const STUDENT_CSV_COLUMNS: ColumnDef[] = [
  {
    key: "admission_no",
    label: "Admission No",
    required: true,
    example: "S00202601",
  },
  {
    key: "full_name",
    label: "Full Name",
    required: true,
    example: "Aarav Sharma",
  },
  {
    key: "date_of_birth",
    label: "Date of Birth",
    required: false,
    example: "2015-06-15",
  },
  { key: "gender", label: "Gender", required: false, example: "Male" },
  { key: "blood_group", label: "Blood Group", required: false, example: "B+" },
  {
    key: "parent_name",
    label: "Parent Name",
    required: false,
    example: "Rajesh Sharma",
  },
  { key: "phone", label: "Phone", required: false, example: "9876543210" },
  {
    key: "email",
    label: "Email",
    required: false,
    example: "rajesh@example.com",
  },
  {
    key: "address",
    label: "Address",
    required: false,
    example: "12 MG Road, Kochi",
  },
  {
    key: "emergency_contact",
    label: "Emergency Contact",
    required: false,
    example: "9876543211",
  },
];

export default function StudentsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [
        { data: studentsData, error: sErr },
        { data: classesData },
        { data: yearsData },
      ] = await Promise.all([
        supabase
          .from("students")
          .select(
            "*, student_enrollments(id, status, class_id, academic_year_id, classes(class_name, section), academic_years(name))",
          )
          .order("created_at", { ascending: false }),
        supabase.from("classes").select("*").order("class_name"),
        supabase
          .from("academic_years")
          .select("*")
          .order("start_date", { ascending: false }),
      ]);
      if (sErr) throw sErr;
      setStudents((studentsData as Student[]) || []);
      setClasses(classesData || []);
      setAcademicYears(yearsData || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", deleteId);
      if (error) throw error;
      setDeleteDialogOpen(false);
      setDeleteId(null);
      await fetchAll();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = students.filter((s) => {
    const matchSearch =
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.admission_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone || "").includes(searchTerm);
    const activeEnrollment = s.student_enrollments?.find(
      (e: any) => e.status === "active",
    );
    const matchClass =
      classFilter === "all" || activeEnrollment?.class_id === classFilter;
    const matchYear =
      yearFilter === "all" || activeEnrollment?.academic_year_id === yearFilter;
    return matchSearch && matchClass && matchYear;
  });

  const getClassName = (s: Student) => {
    const activeEnrollment = s.student_enrollments?.find(
      (e: any) => e.status === "active",
    );
    if (!activeEnrollment?.classes) return "—";
    const c = activeEnrollment.classes as any;
    return c.section ? `${c.class_name} ${c.section}` : c.class_name;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Students</h1>
          <p className="text-slate-600 mt-1">
            Manage all students in the school
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setCsvDialogOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button
            className="gap-2"
            onClick={() => router.push("/dashboard/students/new")}
          >
            <Plus className="h-4 w-4" />
            Add Student
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, admission no, or phone…"
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.section ? `${c.class_name} ${c.section}` : c.class_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Academic Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Academic Years</SelectItem>
                {academicYears.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Students ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-slate-500">
              No students found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profile</TableHead>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Current Class</TableHead>
                    <TableHead>History</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="relative h-10 w-10 overflow-hidden rounded-full border bg-slate-100 flex items-center justify-center">
                          {student.image_url ? (
                            <Image
                              src={student.image_url}
                              alt={student.full_name}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          ) : (
                            <User className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {student.admission_no}
                      </TableCell>
                      <TableCell className="font-medium">
                        {student.full_name}
                      </TableCell>
                      <TableCell>{getClassName(student)}</TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-md">
                          {student.student_enrollments?.length || 0} years
                        </span>
                      </TableCell>
                      <TableCell>{student.parent_name || "—"}</TableCell>
                      <TableCell>{student.phone || "—"}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            student.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {student.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/dashboard/students/${student.id}`)
                            }
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setDeleteId(student.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
          </DialogHeader>
          <p className="text-slate-600">
            Are you sure you want to delete this student? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={csvDialogOpen}
        onOpenChange={setCsvDialogOpen}
        columns={STUDENT_CSV_COLUMNS}
        tableName="students"
        entityName="Students"
        transformRow={(row) => ({
          admission_no: row.admission_no,
          full_name: row.full_name,
          date_of_birth: row.date_of_birth || null,
          gender: row.gender || null,
          blood_group: row.blood_group || null,
          parent_name: row.parent_name || null,
          phone: row.phone || null,
          email: row.email || null,
          address: row.address || null,
          emergency_contact: row.emergency_contact || null,
          is_active: true,
        })}
        onSuccess={fetchAll}
      />
    </div>
  );
}
