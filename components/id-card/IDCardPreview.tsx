"use client";

import React, { forwardRef } from "react";
import { IDCardData, IDCardSettings } from "./types";
import { QRCodeSVG } from "qrcode.react";

interface IDCardPreviewProps {
  data: IDCardData;
  settings: IDCardSettings;
  isBack?: boolean;
}

export const IDCardPreview = forwardRef<HTMLDivElement, IDCardPreviewProps>(
  ({ data, settings, isBack }, ref) => {
    const {
      studentName,
      studentPhoto,
      grade,
      stream,
      idNumber,

      academicYear,
      bloodGroup,
      expiryDate,
    } = data;

    const { themeColor, cardSize, fontFamily } = settings;

    const schoolWebsite = "https://sreenandanam-school-website.vercel.app";


    // Use CR80 standard ratio ~2.125 x 3.375 inches
    const containerStyle = {
      width: cardSize === "CR80" ? "220pt" : cardSize === "A6" ? "297pt" : "220pt",
      height: cardSize === "CR80" ? "345pt" : cardSize === "A6" ? "420pt" : "345pt",
      fontFamily: fontFamily || "sans-serif",
      backgroundColor: "#ffffff",
    };

    // Split name into first and rest for styling like the template
    const nameParts = studentName ? studentName.split(" ") : ["Student", "Name"];
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ");

    return (
      <div
        ref={ref}
        className="relative overflow-hidden border border-[#f3f4f6]"
        style={{ ...containerStyle, borderRadius: "16px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)" }}
      >
        {/* Hardware Lanyard Hole */}
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 w-[40px] h-[8px] rounded-full z-50 border border-[#e5e7eb]"
          style={{ backgroundColor: "#f8f9fa", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)" }}
        />

        {!isBack ? (
          // ================= FRONT CARD =================
          <div className="w-full h-full relative flex flex-col pt-12">

            {/* SVG Backgrounds */}
            <svg className="absolute inset-0 w-full h-full z-0" preserveAspectRatio="none" viewBox="0 0 100 100">
              {/* Top left faint polygon */}
              <polygon points="0,0 30,0 0,30" fill="#f3f4f6" opacity="0.5" />
              {/* Bottom Teal Shape */}
              <polygon points="0,65 100,45 100,100 0,100" fill={themeColor} />
            </svg>

            {/* Header */}
            <div className="flex flex-col items-center z-10">
              <img src="/logo.png" alt="School Logo" className="w-35 h-35 object-contain mb-1" />

            </div>

            {/* Photo Section */}
            <div className="flex justify-center mt-2 z-10 relative">
              <div className="relative">
                <div
                  className="w-[90px] h-[110px] rounded-[14px] p-0 overflow-hidden bg-[#ffffff]"
                  style={{ boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)" }}
                >
                  {studentPhoto ? (
                    <img src={studentPhoto} alt="Photo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#e5e7eb] flex items-center justify-center">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Identity Details */}
            <div className="flex flex-col items-center mt-6 z-10">
              <div className="text-xl text-[#000000] leading-tight">
                <span className="font-bold">{firstName}</span>{" "}
                <span className="font-bold">{lastName}</span>
              </div>
              <div className="text-[9px] text-[#333333] tracking-wide mt-1 uppercase font-medium">
                {grade || "Role"} {stream ? ` | ${stream}` : ""}
              </div>
            </div>

            {/* Footer Row */}
            <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end z-10">
              <div className="flex flex-col gap-[2px]">
                <div className="flex items-center gap-1 text-[#ffffff] text-[8px] font-bold tracking-wider">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 17l9.2-9.2M17 17V7H7" />
                  </svg>
                  ID: {idNumber || "1234567"}
                </div>
                {academicYear && (
                  <div className="text-[#e5e5e5] text-[6.5px] ml-[12px] font-medium tracking-wide uppercase">
                    Year: {academicYear}
                  </div>
                )}
              </div>
              {/* Decorative mini-barcode requested in template */}
              <div className="flex gap-[2px] items-end h-[12px] opacity-70">
                <div className="w-[1.5px] h-full bg-white"></div>
                <div className="w-[2.5px] h-full bg-white"></div>
                <div className="w-[1px] h-full bg-white"></div>
                <div className="w-[2px] h-full bg-white"></div>
                <div className="w-[1.5px] h-[8px] bg-white"></div>
                <div className="w-[1px] h-full bg-white"></div>
                <div className="w-[3px] h-full bg-white"></div>
                <div className="w-[1px] h-[10px] bg-white"></div>
              </div>
            </div>

          </div>
        ) : (
          // ================= BACK CARD =================
          <div className="w-full h-full relative flex flex-col">

            {/* SVG Backgrounds */}
            <svg className="absolute inset-0 w-full h-full z-0" preserveAspectRatio="none" viewBox="0 0 100 100">
              {/* Top Teal Shape */}
              <polygon points="0,0 100,0 100,75 0,60" fill={themeColor} />
            </svg>

            {/* Blood Group Badge - Top Right */}
            <div className="absolute top-8 right-4 z-20">
              <div className="flex items-center justify-center px-2 py-1 rounded bg-[#ffffff]" style={{ boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
                <span className="text-[10px] font-extrabold" style={{ color: themeColor }}>{bloodGroup || "O+"}</span>
              </div>
            </div>



            {/* Centered QR Code */}
            <div className="z-10 mt-30 w-full flex flex-col items-center justify-center">
              <div
                className="p-1.5 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "rgba(255,255,255,0.2)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
              >
                <div className="bg-[#ffffff] p-1.5 rounded-lg" style={{ boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
                  <QRCodeSVG
                    value={schoolWebsite + "/s/id-card/student/" + idNumber || "https://example.com"}
                    size={60}
                    level="L"
                    bgColor="#ffffff"
                    fgColor={themeColor}
                  />
                </div>
              </div>
              <div className="text-[#ffffff] text-[12px] mt-5 font-bold tracking-widest uppercase opacity-90">
                Scan for details
              </div>
              {expiryDate && (
                <div className="text-[#e5e5e5] text-[7px] mt-1 font-medium tracking-wide uppercase">
                  Valid until: {expiryDate}
                </div>
              )}
            </div>

            {/* Bottom Section: Addresses and Return Info */}
            <div className="absolute bottom-4 left-0 w-full px-5 flex flex-col items-center text-center z-10">
              <div className="text-[10px] text-[#374151] leading-tight space-y-2 w-full">

                {/* Branch 1 */}
                <div>
                  <div className="font-bold text-[#111827] text-[12px]">Sree Nandanam Schools</div>
                  <div>Near Mahadeva Temple, Parassala, Kerala</div>
                  <div className="font-bold">Ph: +0471 2201497</div>
                </div>

                {/* Branch 2 */}
                <div>
                  <div>Near KSRTC Depot, Kurumkutty</div>
                  <div className="font-bold">Ph: +0471 2202698</div>
                </div>

                {/* Return Instruction */}
                <div className="italic text-[7px] leading-[1.3] pt-1 text-[#6b7280] border-t border-[#e5e7eb] mt-2">
                  If found, please return to the school office.<br />
                  Finder may contact the numbers above.
                </div>
              </div>
            </div>
          </div>

        )}
      </div>
    );
  }
);

IDCardPreview.displayName = "IDCardPreview";
