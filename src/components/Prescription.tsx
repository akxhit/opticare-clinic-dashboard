import { format } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, MessageSquare, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

import { Patient, Visit, DoctorProfile } from "@/types/database";

interface PrescriptionProps {
  patient: Pick<Patient, "name" | "age" | "gender" | "phone">;
  visit: Visit;
}

function fmt(v: number | null | undefined) {
  if (v == null) return "—";
  return v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
}

export function Prescription({ patient, visit }: PrescriptionProps) {
  const { user } = useAuth();
  const [isSharing, setIsSharing] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data as DoctorProfile;
    },
    enabled: !!user?.id,
  });

  const handleWhatsAppShare = async () => {
    const element = document.getElementById("prescription-content");
    if (!element || !user) return;

    // Open the window IMMEDIATELY to avoid popup blockers
    // Some browsers block window.open if it happens after an async wait (like html2canvas)
    const whatsappWindow = window.open("", "_blank");
    if (!whatsappWindow) {
      toast.error("Popup blocked! Please allow popups for this site to share via WhatsApp.");
      return;
    }

    // Set a loading message in the new window
    whatsappWindow.document.write("<p style='font-family:sans-serif; text-align:center; margin-top:50px;'>Generating prescription PDF... Please wait.</p>");

    try {
      setIsSharing(true);
      toast.info("Generating PDF...");

      // Generate Canvas
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 800, // Force desktop width for capture
        windowWidth: 800, // Ensure layout behaves as desktop
        scrollX: 0,
        scrollY: 0,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      // Create PDF with internal stream compression
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Calculate dimensions with a 10mm margin for a clean look
      const margin = 10;
      const maxWidth = pageWidth - (margin * 2);
      const maxHeight = pageHeight - (margin * 2);

      let imgWidth = maxWidth;
      let imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      // If height is too much, scale down further to fit page
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = (imgProps.width * imgHeight) / imgProps.height;
      }

      // Calculate centering offsets
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;

      pdf.addImage(imgData, "JPEG", x, y, imgWidth, imgHeight, undefined, "FAST");
      const pdfBlob = pdf.output("blob");

      toast.info("Uploading PDF...");

      // Upload to Supabase Storage
      const fileName = `${user.id}/${patient.name.replace(/\s+/g, '_')}_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("prescriptions")
        .upload(fileName, pdfBlob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Build the Cleaner Public Link (masks Supabase and forces download)
      const shareUrl = `${window.location.origin}/share?f=${fileName}`;

      // Build WhatsApp Link
      const phoneNumber = patient.phone?.replace(/\D/g, "");
      if (!phoneNumber) {
        whatsappWindow.close();
        toast.error("Patient phone number is missing or invalid");
        return;
      }

      const finalPhone = phoneNumber.length === 10 ? `91${phoneNumber}` : phoneNumber;

      const message = encodeURIComponent(
        `Hello ${patient.name}, here is your digital prescription from ${profile?.clinic_name || "OptiCare Clinic"}:\n\n${shareUrl}`
      );

      const whatsappUrl = `https://wa.me/${finalPhone}?text=${message}`;

      // Update the already opened window
      whatsappWindow.location.href = whatsappUrl;

      toast.success("Prescription shared successfully!");
    } catch (error: any) {
      console.error("WhatsApp share error:", error);
      whatsappWindow?.close();
      toast.error(`Failed to share prescription: ${error.message}`);
    } finally {
      setIsSharing(false);
    }
  };

  const handleFastShare = () => {
    // Build WhatsApp Link for Text-only summary (Instant)
    const phoneNumber = patient.phone?.replace(/\D/g, "");
    if (!phoneNumber) {
      toast.error("Patient phone number is missing or invalid");
      return;
    }

    const finalPhone = phoneNumber.length === 10 ? `91${phoneNumber}` : phoneNumber;

    // Formatting the text message
    let messageBody = `Hello ${patient.name}, here is your prescription summary from ${profile?.clinic_name || "OptiCare Clinic"}:\n\n`;
    messageBody += `*Date:* ${format(new Date(visit.visit_date), "MMMM d, yyyy")}\n`;

    if (visit.od_visual_acuity || visit.os_visual_acuity) {
      messageBody += `*VA:* OD: ${visit.od_visual_acuity || "—"}, OS: ${visit.os_visual_acuity || "—"}\n`;
    }

    if (visit.diagnosis) {
      messageBody += `*Diagnosis:* ${visit.diagnosis}\n`;
    }

    if (visit.next_appointment_date) {
      messageBody += `\n*Next Appointment:* ${format(new Date(visit.next_appointment_date), "MMMM d, yyyy")}`;
    }

    const message = encodeURIComponent(messageBody);
    const whatsappUrl = `https://wa.me/${finalPhone}?text=${message}`;
    window.open(whatsappUrl, "_blank");
    toast.success("WhatsApp opened!");
  };

  return (
    <div id="prescription-section">
      {/* Print & Share buttons — hidden during print */}
      <div className="mb-4 flex flex-wrap justify-end gap-2 print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={handleFastShare}
          className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900 dark:hover:bg-green-900/50 transition-all font-medium"
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Fast Share (Text)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleWhatsAppShare}
          disabled={isSharing}
          className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900 dark:hover:bg-blue-900/50 transition-all font-medium"
        >
          {isSharing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="mr-2 h-4 w-4" />
          )}
          Send PDF
        </Button>
        <Button size="sm" onClick={() => window.print()} className="font-medium">
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>

      {/* Printable content */}
      <div id="prescription-content" className="rounded-lg border bg-white p-8 text-gray-900 print:border-none print:shadow-none print:p-0">
        {/* Clinic Header */}
        <header className="mb-6 border-b border-gray-200 pb-4 flex items-start justify-between">
          <div className="flex-shrink-0">
            {profile?.logo_url ? (
              <img
                src={profile.logo_url}
                alt="Clinic Logo"
                className="h-16 w-auto object-contain"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-2xl">
                👁
              </div>
            )}
          </div>
          <div className="text-right space-y-0.5">
            <h2 className="text-lg font-bold tracking-tight">
              {profile?.clinic_name || "Clinic Name"}
            </h2>
            {profile?.clinic_address && (
              <p className="text-sm text-gray-500">{profile.clinic_address}</p>
            )}
            {profile?.clinic_phone && (
              <p className="text-sm text-gray-500">{profile.clinic_phone}</p>
            )}
            {profile?.license_number && (
              <p className="text-xs text-gray-400">License # {profile.license_number}</p>
            )}
          </div>
        </header>

        {/* Patient Info & Date */}
        <div className="mb-6 flex items-start justify-between">
          <div className="space-y-1 text-sm">
            <p><span className="font-semibold">Patient:</span> {patient.name}</p>
            <p><span className="font-semibold">Age:</span> {patient.age} yrs{patient.gender ? ` · ${patient.gender}` : ""}</p>
            {patient.phone && <p><span className="font-semibold">Phone:</span> {patient.phone}</p>}
          </div>
          <div className="text-right text-sm">
            <p><span className="font-semibold">Date:</span> {format(new Date(visit.visit_date), "MMMM d, yyyy")}</p>
          </div>
        </div>



        {/* Refraction Table */}
        <table className="mb-6 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-3 py-2 text-left font-semibold">Eye</th>
              <th className="border border-gray-200 px-3 py-2 text-center font-semibold">VA</th>
              <th className="border border-gray-200 px-3 py-2 text-center font-semibold">Sph</th>
              <th className="border border-gray-200 px-3 py-2 text-center font-semibold">Cyl</th>
              <th className="border border-gray-200 px-3 py-2 text-center font-semibold">Axis</th>
              <th className="border border-gray-200 px-3 py-2 text-center font-semibold">IOP (mmHg)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-200 px-3 py-2 font-semibold">OD (Right)</td>
              <td className="border border-gray-200 px-3 py-2 text-center">{visit.od_visual_acuity || "—"}</td>
              <td className="border border-gray-200 px-3 py-2 text-center">{fmt(visit.od_sph)}</td>
              <td className="border border-gray-200 px-3 py-2 text-center">{fmt(visit.od_cyl)}</td>
              <td className="border border-gray-200 px-3 py-2 text-center">{visit.od_axis != null ? `${visit.od_axis}°` : "—"}</td>
              <td className="border border-gray-200 px-3 py-2 text-center">{visit.od_iop != null ? visit.od_iop : "—"}</td>
            </tr>
            <tr>
              <td className="border border-gray-200 px-3 py-2 font-semibold">OS (Left)</td>
              <td className="border border-gray-200 px-3 py-2 text-center">{visit.os_visual_acuity || "—"}</td>
              <td className="border border-gray-200 px-3 py-2 text-center">{fmt(visit.os_sph)}</td>
              <td className="border border-gray-200 px-3 py-2 text-center">{fmt(visit.os_cyl)}</td>
              <td className="border border-gray-200 px-3 py-2 text-center">{visit.os_axis != null ? `${visit.os_axis}°` : "—"}</td>
              <td className="border border-gray-200 px-3 py-2 text-center">{visit.os_iop != null ? visit.os_iop : "—"}</td>
            </tr>
          </tbody>
        </table>

        {/* Diagnosis & Notes */}
        {visit.diagnosis && (
          <div className="mb-4">
            <p className="text-sm font-semibold">Diagnosis</p>
            <p className="mt-1 text-sm whitespace-pre-line">{visit.diagnosis}</p>
          </div>
        )}
        {visit.clinical_notes && (
          <div className="mb-4">
            <p className="text-sm font-semibold">Clinical Notes</p>
            <p className="mt-1 text-sm whitespace-pre-line">{visit.clinical_notes}</p>
          </div>
        )}

        {/* Next Appointment */}
        {visit.next_appointment_date && (
          <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 p-3">
            <p className="text-sm font-semibold text-blue-700">Next Appointment</p>
            <p className="mt-1 text-sm">{format(new Date(visit.next_appointment_date), "MMMM d, yyyy")}</p>
          </div>
        )}

        {/* Doctor Signature */}
        <div className="mt-12 flex justify-end">
          <div className="w-56 text-center">
            {profile?.signature_url ? (
              <img
                src={profile.signature_url}
                alt="Doctor Signature"
                className="mx-auto mb-1 h-16 w-auto object-contain"
              />
            ) : (
              <div className="h-16" />
            )}
            <div className="border-t border-gray-300 pt-2 text-sm font-medium">
              {profile?.doctor_name || "Doctor's Signature"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
