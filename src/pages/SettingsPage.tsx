import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Trash2 } from "lucide-react";

function ImageUploadZone({
  label,
  imageUrl,
  uploading,
  onUpload,
  onRemove,
  fallback,
}: {
  label: string;
  imageUrl: string | null;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  fallback: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-20 w-20 rounded-lg">
        <AvatarImage src={imageUrl ?? undefined} alt={label} className="object-contain" />
        <AvatarFallback className="rounded-lg bg-muted text-muted-foreground text-xs">
          {fallback}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          Upload {label}
        </Button>
        {imageUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={onRemove}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const [doctorName, setDoctorName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setDoctorName(profile.doctor_name ?? "");
      setClinicName(profile.clinic_name ?? "");
      setLicenseNumber(profile.license_number ?? "");
      setClinicAddress((profile as any).clinic_address ?? "");
      setClinicPhone((profile as any).clinic_phone ?? "");
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const { error } = await supabase
        .from("profiles")
        .update(data as any)
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({ title: "Profile updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error updating profile", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      doctor_name: doctorName,
      clinic_name: clinicName,
      license_number: licenseNumber,
      clinic_address: clinicAddress,
      clinic_phone: clinicPhone,
    });
  };

  const uploadAsset = async (file: File, key: string, urlColumn: string) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${key}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("clinic_assets")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("clinic_assets").getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ [urlColumn]: publicUrl } as any)
        .eq("id", user.id);
      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast({ title: `${key === "logo" ? "Logo" : "Signature"} uploaded` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeAsset = async (urlColumn: string, key: string) => {
    if (!user) return;
    setUploading(true);
    try {
      const { data: files } = await supabase.storage.from("clinic_assets").list(user.id);
      const matchingFiles = files?.filter((f) => f.name.startsWith(key)) ?? [];
      if (matchingFiles.length) {
        await supabase.storage.from("clinic_assets").remove(matchingFiles.map((f) => `${user.id}/${f.name}`));
      }
      await supabase.from("profiles").update({ [urlColumn]: null } as any).eq("id", user.id);
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast({ title: `${key === "logo" ? "Logo" : "Signature"} removed` });
    } catch (err: any) {
      toast({ title: "Error removing file", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your profile and clinic details</p>
      </div>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clinic Logo</CardTitle>
          <CardDescription>This logo will appear on printed prescriptions.</CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUploadZone
            label="Logo"
            imageUrl={profile?.logo_url ?? null}
            uploading={uploading}
            onUpload={(file) => uploadAsset(file, "logo", "logo_url")}
            onRemove={() => removeAsset("logo_url", "logo")}
            fallback="Logo"
          />
        </CardContent>
      </Card>

      {/* Signature */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Doctor Signature</CardTitle>
          <CardDescription>Your signature will appear on printed prescriptions.</CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUploadZone
            label="Signature"
            imageUrl={(profile as any)?.signature_url ?? null}
            uploading={uploading}
            onUpload={(file) => uploadAsset(file, "signature", "signature_url")}
            onRemove={() => removeAsset("signature_url", "signature")}
            fallback="Sig"
          />
        </CardContent>
      </Card>

      {/* Profile Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Details</CardTitle>
          <CardDescription>Your name and clinic info for prescriptions.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doctorName">Doctor Name</Label>
              <Input id="doctorName" placeholder="Dr. Jane Smith" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinicName">Clinic Name</Label>
              <Input id="clinicName" placeholder="OptiCare Eye Clinic" value={clinicName} onChange={(e) => setClinicName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinicAddress">Clinic Address</Label>
              <Input id="clinicAddress" placeholder="123 Main St, City" value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinicPhone">Clinic Phone</Label>
              <Input id="clinicPhone" placeholder="+1 (555) 123-4567" value={clinicPhone} onChange={(e) => setClinicPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">Medical License Number</Label>
              <Input id="licenseNumber" placeholder="LIC-12345" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
            </div>
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
