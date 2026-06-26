"use client";

import React, { useState, useRef } from "react";
import { IDCardData, IDCardSettings } from "@/components/id-card/types";
import { IDCardPreview } from "@/components/id-card/IDCardPreview";
import { IDCardForm } from "@/components/id-card/IDCardForm";

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
          <div className="bg-white rounded-xl border-2 border-dashed border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider text-center">Live Preview</h3>
            </div>
            <div className="flex flex-col items-center justify-center min-h-[500px] p-8">

              <div className="relative">
                <div
                  className="flex flex-col xl:flex-row gap-6 transition-transform duration-300 ease-in-out hover:scale-[1.02]"
                  style={{ transformOrigin: "center" }}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-semibold mb-2 uppercase tracking-wider text-slate-500">
                      Front
                    </span>
                    <IDCardPreview
                      data={data}
                      settings={settings}
                      isBack={false}
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-semibold mb-2 uppercase tracking-wider text-slate-500">
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

              <p className="text-xs text-slate-400 mt-8 text-center max-w-sm">
                The preview above shows how the ID card will look. Use the settings panel on the left to customize the appearance.
              </p>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
