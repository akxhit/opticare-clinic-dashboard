import { useState } from "react";
import { PatientsTable } from "@/components/PatientsTable";
import { ArchivedPatientsTable } from "@/components/ArchivedPatientsTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Patients() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
        <p className="text-muted-foreground">Manage your patient records</p>
      </div>
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">
          <PatientsTable />
        </TabsContent>
        <TabsContent value="archived" className="mt-4">
          <ArchivedPatientsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
