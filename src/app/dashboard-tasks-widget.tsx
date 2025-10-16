"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CalendarIcon, PencilIcon, Trash2Icon, SaveIcon, XIcon } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import jsPDF from "jspdf";
import { hybridStorage } from "@/lib/hybrid-storage";

const STATUS_OPTIONS = [
  { value: "offen", label: "Offen" },
  { value: "inBearbeitung", label: "In Bearbeitung" },
  { value: "erledigt", label: "Erledigt" },
];

const SORT_OPTIONS = [
  { value: "dateAsc", label: "Datum aufsteigend" },
  { value: "dateDesc", label: "Datum absteigend" },
  { value: "status", label: "Status" },
];

const STATUS_ORDER: Record<string, number> = { offen: 1, inBearbeitung: 2, erledigt: 3 };

function getStatusColor(status: string) {
  switch (status) {
    case "offen":
      return "#ffeaea"; // dezent rot
    case "inBearbeitung":
      return "#fffbe5"; // dezent gelb
    case "erledigt":
      return "#eaffea"; // dezent grün
    default:
      return "transparent";
  }
}

function getStatusBgColor(status: string) {
  switch (status) {
    case "offen":
      return "bg-[#ffeaea]"; // dezent rot
    case "inBearbeitung":
      return "bg-[#fffbe5]"; // dezent gelb
    case "erledigt":
      return "bg-[#eaffea]"; // dezent grün
    default:
      return "";
  }
}

export interface DashboardTask {
  id: string;
  name: string;
  description: string;
  notes: string;
  status: string;
  date: string;
}

export default function DashboardTasksWidget() {
  console.log('🔵 DashboardTasksWidget RENDER gestartet');
  
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("offen");
  const [editId, setEditId] = useState<string|null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("offen");
  const [editDate, setEditDate] = useState("");
  const [date, setDate] = useState("");
  const [sortBy, setSortBy] = useState("dateAsc");
  const [isLoading, setIsLoading] = useState(true);
  
  console.log('🔵 State initialisiert, tasks.length:', tasks.length, 'isLoading:', isLoading);

  // 🔍 DEBUG: TODO-Liste LADEN mit ausführlichem Logging
  useEffect(() => {
    let mounted = true;
    
    console.log('🔄 Dashboard Tasks Widget: Lade gespeicherte Aufgaben...');
    
    (async () => {
      try {
        // STRATEGIE 1: hybridStorage (Electron)
        console.log('📦 Versuche hybridStorage.get("dashboardTasks")...');
        const hybridData = await hybridStorage.get("dashboardTasks");
        console.log('📦 hybridStorage Ergebnis:', hybridData);
        
        // STRATEGIE 2: localStorage (Fallback)
        let localData = null;
        try {
          const localStr = localStorage.getItem("dashboardTasks");
          console.log('💾 localStorage Ergebnis (raw):', localStr?.substring(0, 100));
          if (localStr) {
            localData = JSON.parse(localStr);
            console.log('💾 localStorage Ergebnis (parsed):', localData);
          }
        } catch (e) {
          console.error('❌ localStorage Fehler:', e);
        }
        
        // Verwende hybridData wenn vorhanden, sonst localData
        const stored = hybridData || localData;
        
        if (mounted && stored && Array.isArray(stored)) {
          console.log('✅ Dashboard Tasks erfolgreich geladen:', stored.length, 'Aufgaben');
          console.log('✅ Erste Aufgabe:', stored[0]);
          setTasks(stored);
        } else {
          console.warn('⚠️ Keine gespeicherten Dashboard Tasks gefunden!');
          console.log('⚠️ hybridData:', hybridData);
          console.log('⚠️ localData:', localData);
        }
      } catch (error) {
        console.error('❌ KRITISCHER FEHLER beim Laden der Dashboard Tasks:', error);
      } finally {
        if (mounted) {
          console.log('✅ Lade-Prozess abgeschlossen, isLoading = false');
          setIsLoading(false);
        }
      }
    })();
    
    return () => {
      console.log('🧹 Dashboard Tasks Widget wird unmounted');
      mounted = false;
    };
  }, []);

  // 🔍 DEBUG: TODO-Liste SPEICHERN mit ausführlichem Logging
  useEffect(() => {
    console.log('🔄 Save-Effect triggered, isLoading:', isLoading, 'tasks.length:', tasks.length);
    
    if (isLoading) {
      console.log('⏸️ Speichern übersprungen (isLoading = true)');
      return;
    }
    
    console.log('💾 Starte Speicher-Prozess für', tasks.length, 'Aufgaben...');
    console.log('💾 Tasks:', JSON.stringify(tasks).substring(0, 200));
    
    (async () => {
      try {
        // STRATEGIE 1: localStorage (SOFORT, SYNCHRON, ZUVERLÄSSIG)
        const tasksJson = JSON.stringify(tasks);
        localStorage.setItem("dashboardTasks", tasksJson);
        console.log('✅ localStorage.setItem erfolgreich:', tasksJson.length, 'Zeichen');
        
        // Verification: Sofort wieder lesen
        const verification = localStorage.getItem("dashboardTasks");
        if (verification === tasksJson) {
          console.log('✅ localStorage VERIFICATION erfolgreich!');
        } else {
          console.error('❌ localStorage VERIFICATION FEHLGESCHLAGEN!');
          console.log('Geschrieben:', tasksJson.substring(0, 100));
          console.log('Gelesen:', verification?.substring(0, 100));
        }
        
        // STRATEGIE 2: hybridStorage (für Electron + GitHub Sync)
        console.log('☁️ Speichere zu hybridStorage...');
        await hybridStorage.set("dashboardTasks", tasks);
        console.log('✅ hybridStorage.set erfolgreich');
        
        // Verification: Sofort wieder lesen
        const hybridVerification = await hybridStorage.get("dashboardTasks");
        if (JSON.stringify(hybridVerification) === tasksJson) {
          console.log('✅ hybridStorage VERIFICATION erfolgreich!');
        } else {
          console.error('❌ hybridStorage VERIFICATION FEHLGESCHLAGEN!');
          console.log('Geschrieben:', tasksJson.substring(0, 100));
          console.log('Gelesen:', JSON.stringify(hybridVerification)?.substring(0, 100));
        }
        
      } catch (error) {
        console.error('❌ KRITISCHER FEHLER beim Speichern:', error);
        console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
      }
    })();
  }, [tasks, isLoading]);

  const handleAddTask = () => {
    console.log('🎯 handleAddTask aufgerufen!');
    console.log('🎯 name:', name);
    console.log('🎯 tasks.length vorher:', tasks.length);
    
    if (!name.trim()) {
      console.log('⚠️ Name ist leer, abbruch!');
      return;
    }
    
    const newTask = {
      id: Date.now().toString(),
      name: name.trim(),
      description: description.trim(),
      notes: notes.trim(),
      status,
      date: date || new Date().toISOString().slice(0,10),
    };
    
    console.log('➕ Neue Task:', newTask);
    
    const newTasks = [...tasks, newTask];
    console.log('🎯 tasks.length nachher:', newTasks.length);
    console.log('🎯 Rufe setTasks auf...');
    
    setTasks(newTasks);
    
    console.log('✅ setTasks aufgerufen!');
    
    setName("");
    setDescription("");
    setNotes("");
    setStatus("offen");
    setDate("");
    
    console.log('✅ Form zurückgesetzt');
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    if (editId === id) setEditId(null);
  };

  const handleEditTask = (task: DashboardTask) => {
    setEditId(task.id);
    setEditName(task.name);
    setEditDescription(task.description);
    setEditNotes(task.notes);
    setEditStatus(task.status);
    setEditDate(task.date);
  };

  const handleSaveEdit = () => {
    if (!editId) return;
    setTasks(tasks.map(t => t.id === editId ? {
      ...t,
      name: editName,
      description: editDescription,
      notes: editNotes,
      status: editStatus,
      date: editDate || new Date().toISOString().slice(0,10),
    } : t));
    setEditId(null);
  };

  const handleCancelEdit = () => {
    setEditId(null);
  };

  const handleExport = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text("To-Do / Projektliste", 105, 18, { align: "center" });
    doc.setFontSize(9);
    doc.setDrawColor(220, 220, 220);
    doc.line(20, 22, 190, 22);
    let y = 30;
    // Tabellenkopf
  doc.setFont("helvetica", "bold");
    doc.setFillColor(245, 245, 245);
    doc.rect(20, y, 170, 8, "F");
    doc.text("Nr.", 24, y + 6);
    doc.text("Name", 34, y + 6);
    doc.text("Beschreibung", 60, y + 6);
    doc.text("Bemerkungen", 100, y + 6);
    doc.text("Status", 140, y + 6);
    doc.text("Datum", 170, y + 6);
    y += 10;
  doc.setFont("helvetica", "normal");
    sortTasks(tasks, sortBy).forEach((task, idx) => {
      // Zeilenrahmen
      doc.setDrawColor(220,220,220);
      doc.rect(20, y - 2, 170, 14, "S");
      // Statusfeld mit Farbe
      let statusFill = [255,255,255];
      if (task.status === "offen") statusFill = [255,234,234];
      if (task.status === "inBearbeitung") statusFill = [255,251,229];
      if (task.status === "erledigt") statusFill = [234,255,234];
  doc.setFillColor(statusFill[0], statusFill[1], statusFill[2]);
      doc.rect(138, y, 28, 8, "F");
      // Beschreibung/Bemerkungen mehrzeilig
      const descLines = doc.splitTextToSize(task.description || "-", 35);
      const notesLines = doc.splitTextToSize(task.notes || "-", 35);
      let maxLines = Math.max(descLines.length, notesLines.length);
      for (let i = 0; i < maxLines; i++) {
        doc.text(descLines[i] || "", 60, y + 6 + i * 4);
        doc.text(notesLines[i] || "", 100, y + 6 + i * 4);
      }
      // Restliche Felder
      doc.text(`${idx + 1}`, 24, y + 6);
      doc.text(task.name || "-", 34, y + 6);
      doc.text(STATUS_OPTIONS.find(opt => opt.value === task.status)?.label || task.status, 140, y + 6);
      doc.text(task.date || "-", 170, y + 6);
      y += 14 + (maxLines-1)*4;
      if (y > 270) {
        doc.addPage();
        y = 30;
      }
    });
    doc.save(`dashboard-tasks-${new Date().toISOString().slice(0,10)}.pdf`);
  };

  function sortTasks(tasks: DashboardTask[], sortBy: string) {
    if (sortBy === "dateAsc") {
      return [...tasks].sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
    }
    if (sortBy === "dateDesc") {
      return [...tasks].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    }
    if (sortBy === "status") {
      return [...tasks].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
    }
    return tasks;
  }

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>To-Do / Projektliste</CardTitle>
        <Button variant="outline" size="sm" onClick={handleExport} title="Exportieren" className="ml-2">Export</Button>
      </CardHeader>
      <CardContent>
  <div className="flex items-center mb-4 gap-4">
    <label className="font-medium">Sortierung:</label>
    <Select value={sortBy} onValueChange={setSortBy}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
  <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="Taskname"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <Input
            placeholder="Kurzbeschreibung"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <Textarea
            placeholder="Bemerkungen"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="md:col-span-2"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full min-w-[160px] text-base">
              <SelectValue placeholder="Status wählen" className="truncate" />
            </SelectTrigger>
            <SelectContent className="text-base">
              {STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-base whitespace-normal">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="md:col-span-2"
            placeholder="Datum"
          />
          <Button className="md:col-span-2" onClick={handleAddTask}>Task hinzufügen</Button>
        </div>
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Aufgaben / Projekte</h3>
          <ul className="space-y-2">
            {sortTasks(tasks, sortBy).length === 0 && <li className="text-muted-foreground">Keine Aufgaben vorhanden.</li>}
            {sortTasks(tasks, sortBy).map(task => (
              <li key={task.id} className="border rounded p-3 flex flex-col md:flex-row md:items-center md:gap-4 bg-muted/50">
                {editId === task.id ? (
                  <>
                    <div className="flex-1">
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="mb-2"
                      />
                      <Input
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                        className="mb-2"
                      />
                      <Textarea
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        className="mb-2"
                      />
                      <Input
                        type="date"
                        value={editDate}
                        onChange={e => setEditDate(e.target.value)}
                        className="mb-2"
                      />
                    </div>
                    <div className={`flex flex-col items-end gap-2 mt-2 md:mt-0 ${getStatusBgColor(editStatus)} p-2 rounded`}>
                      <Select value={editStatus} onValueChange={setEditStatus}>
                        <SelectTrigger className="w-40 min-w-[160px] text-base">
                          <SelectValue className="truncate" />
                        </SelectTrigger>
                        <SelectContent className="text-base">
                          {STATUS_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="text-base whitespace-normal">{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2 mt-2">
                        <Button size="icon" variant="default" onClick={handleSaveEdit} title="Speichern"><SaveIcon size={18} /></Button>
                        <Button size="icon" variant="outline" onClick={handleCancelEdit} title="Abbrechen"><XIcon size={18} /></Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="font-bold text-primary">{task.name}</div>
                      <div className="text-sm text-muted-foreground">{task.description}</div>
                      <div className="text-xs text-muted-foreground mt-1">{task.notes}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><CalendarIcon size={14} /> {task.date}</div>
                    </div>
                    <div className={`flex flex-col items-end gap-2 mt-2 md:mt-0 ${getStatusBgColor(task.status)} p-2 rounded`}>
                      <Select value={task.status} onValueChange={val => handleStatusChange(task.id, val)}>
                        <SelectTrigger className="w-40 min-w-[160px] text-base">
                          <SelectValue className="truncate" />
                        </SelectTrigger>
                        <SelectContent className="text-base">
                          {STATUS_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="text-base whitespace-normal">{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-xs">Status: {STATUS_OPTIONS.find(opt => opt.value === task.status)?.label}</span>
                      <div className="flex gap-2 mt-2">
                        <Button size="icon" variant="outline" onClick={() => handleEditTask(task)} title="Bearbeiten"><PencilIcon size={18} /></Button>
                        <Button size="icon" variant="outline" onClick={() => handleDeleteTask(task.id)} title="Löschen"><Trash2Icon size={18} /></Button>
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
