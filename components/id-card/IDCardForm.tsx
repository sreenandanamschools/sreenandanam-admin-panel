"use client";

import React, { useRef, useState } from "react";
import { IDCardData, IDCardSettings } from "./types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, RefreshCw, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";


interface IDCardFormProps {
  data: IDCardData;
  setData: (data: IDCardData) => void;
  settings: IDCardSettings;
  setSettings: (settings: IDCardSettings) => void;
}

export function IDCardForm({
  data,
  setData,
  settings,
  setSettings,
}: IDCardFormProps) {
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setData({ ...data, [name]: value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: keyof IDCardData) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setData({ ...data, [field]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const supabase = createClient();
  const [isFetching, setIsFetching] = useState(false);

  const fetchStudentData = async () => {
    if (!data.idNumber) return;

    setIsFetching(true);
    try {
      const { data: student, error } = await supabase
        .from('students')
        .select(`
          *,
          student_enrollments (
            status,
            section,
            classes (class_name),
            academic_years (name)
          )
        `)
        .or(`studentid.eq.${data.idNumber},admission_no.eq.${data.idNumber}`)
        .maybeSingle();

      if (error) {
        alert("Student not found or error occurred during lookup.");
        throw error;
      }

      if (!student) {
        alert("Student not found for the given Student ID / Admission Number.");
        return;
      }

      // Find active enrollment or first available
      const enrollments = student.student_enrollments || [];
      const activeEnrollment = enrollments.find((e: any) => e.status === 'active') || enrollments[0];

      setData({
        ...data,
        idNumber: student.studentid || student.admission_no || data.idNumber,
        studentName: student.full_name || '',
        studentPhoto: student.image_url || '',
        bloodGroup: student.blood_group || data.bloodGroup,
        grade: activeEnrollment?.classes?.class_name || data.grade,
        stream: activeEnrollment?.section || data.stream,
        academicYear: activeEnrollment?.academic_years?.name || data.academicYear,
      });
    } catch (err) {
      console.error("Error fetching student:", err);
    } finally {
      setIsFetching(false);
    }
  };

  const generateIdNumber = async () => {
    const { data: existingStudents } = await supabase
      .from('students')
      .select('admission_no');

    const currentYear = new Date().getFullYear();
    const prefix = `S00${currentYear}`;
    let nextNo = `${prefix}01`;

    if (existingStudents && existingStudents.length > 0) {
      let maxSeq = 0;
      existingStudents.forEach(s => {
        if (s.admission_no && s.admission_no.startsWith(prefix)) {
          const seqStr = s.admission_no.slice(prefix.length);
          const seq = parseInt(seqStr, 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      });
      if (maxSeq > 0) {
        nextNo = `${prefix}${String(maxSeq + 1).padStart(2, '0')}`;
      }
    }

    setData({ ...data, idNumber: nextNo });
  };

  return (
    <div className="space-y-6">
      {/* Settings Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Card Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Theme Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={settings.themeColor}
                  onChange={(e) =>
                    setSettings({ ...settings, themeColor: e.target.value })
                  }
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={settings.themeColor}
                  onChange={(e) =>
                    setSettings({ ...settings, themeColor: e.target.value })
                  }
                  className="flex-1 font-mono uppercase"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Card Size</Label>
              <Select
                value={settings.cardSize}
                onValueChange={(v: any) =>
                  setSettings({ ...settings, cardSize: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CR80">CR80 Standard (54x86mm)</SelectItem>
                  <SelectItem value="A6">A6 Size</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Student Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Student Details</CardTitle>
          <CardDescription>Fill manually or use bulk generation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Student Full Name</Label>
            <Input
              name="studentName"
              value={data.studentName}
              onChange={handleInputChange}
              placeholder="e.g. Aarav Sharma"
            />
          </div>

          <div className="space-y-2">
            <Label>Student Photo</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, "studentPhoto")}
              className="file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Grade / Class</Label>
              <Input
                name="grade"
                value={data.grade}
                onChange={handleInputChange}
                placeholder="e.g. Class 10"
              />
            </div>
            <div className="space-y-2">
              <Label>Stream / Section</Label>
              <Input
                name="stream"
                value={data.stream}
                onChange={handleInputChange}
                placeholder="e.g. Science / A"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Student ID</Label>
            <div className="flex gap-2">
              <Input
                name="idNumber"
                value={data.idNumber}
                onChange={handleInputChange}
                className="flex-1"
                placeholder="e.g. STU-1001 or S00202601"
              />
              <Button type="button" variant="outline" onClick={fetchStudentData} disabled={isFetching}>
                {isFetching ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                Fetch
              </Button>
              <Button type="button" variant="outline" onClick={generateIdNumber}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Auto
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Input
                name="academicYear"
                value={data.academicYear}
                onChange={handleInputChange}
                placeholder="e.g. 2026-27"
              />
            </div>
            <div className="space-y-2">
              <Label>Blood Group</Label>
              <Select
                value={data.bloodGroup}
                onValueChange={(v) => setData({ ...data, bloodGroup: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Blood Group" />
                </SelectTrigger>
                <SelectContent>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                    <SelectItem key={bg} value={bg}>
                      {bg}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Expiry Date</Label>
              <Input
                type="date"
                name="expiryDate"
                value={data.expiryDate}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
