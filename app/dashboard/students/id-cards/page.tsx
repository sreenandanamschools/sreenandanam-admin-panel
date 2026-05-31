"use client";

import React, { useState, useRef } from "react";
import { IDCardData, IDCardSettings } from "@/components/id-card/types";
import { IDCardPreview } from "@/components/id-card/IDCardPreview";
import { IDCardForm } from "@/components/id-card/IDCardForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function IDCardGeneratorPage() {
  const router = useRouter();

  const [data, setData] = useState<IDCardData>({
    schoolName: "Sreenandanam Public School",
    schoolAddress: "",
    schoolPhone: "",

    schoolEmail: "",
    establishedYear: "",
    studentName: "",
    studentPhoto: "", // Will be base64
    grade: "",
    stream: "",
    idNumber: "",
    academicYear: "",
    bloodGroup: "",
    expiryDate: "",
  });

  const [settings, setSettings] = useState<IDCardSettings>({
    themeColor: "#1aaa85", // Teal
    showBack: false,
    cardSize: "CR80",
    fontFamily: "Inter, sans-serif",
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/students")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">ID Card Generator</h1>
          <p className="text-slate-600 mt-1">
            Design and generate student ID cards
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Form Controls */}
        <div className="lg:col-span-4 space-y-6">
          <IDCardForm
            data={data}
            setData={setData}
            settings={settings}
            setSettings={setSettings}
          />
        </div>

        {/* Right Side: Live Preview */}
        <div className="lg:col-span-8 sticky top-6">
          <Card className="border border-dashed border-gray-300 bg-gray-50/50">
            <CardHeader>
              <CardTitle className="text-center text-gray-500">Live Preview</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center min-h-[500px] overflow-auto pb-10">

              <div className="relative">
                <div
                  className="flex flex-col xl:flex-row gap-6 transition-transform duration-300 ease-in-out hover:scale-[1.02]"
                  style={{ transformOrigin: "center" }}
                >
                  <div className="flex flex-col items-center">
                    <span
                      className="text-xs font-semibold mb-2 uppercase tracking-wider"
                      style={{ color: "#6b7280" }}
                    >
                      Front
                    </span>
                    <IDCardPreview
                      data={data}
                      settings={settings}
                      isBack={false}
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <span
                      className="text-xs font-semibold mb-2 uppercase tracking-wider"
                      style={{ color: "#6b7280" }}
                    >
                      Back
                    </span>
                    <IDCardPreview
                      data={data}
                      settings={settings}
                      isBack={true}
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-8 text-center max-w-sm">
                The preview above shows how the ID card will look. Use the settings panel on the left to customize the appearance.
              </p>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
