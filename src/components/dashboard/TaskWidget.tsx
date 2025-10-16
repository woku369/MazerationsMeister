"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CalendarIcon, PencilIcon, Trash2Icon, SaveIcon, XIcon, DownloadIcon, FileTextIcon } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { hybridStorage } from '@/lib/hybrid-storage';

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

function getStatusBgColor(status: string) {
  switch (status) {
    case "offen":
      return "bg-red-50"; // dezent rot
    case "inBearbeitung":
      return "bg-yellow-50"; // dezent gelb
    case "erledigt":
      return "bg-green-50"; // dezent grün
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

export default function TaskWidget() {
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("offen");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("offen");
  const [editDate, setEditDate] = useState("");
  const [date, setDate] = useState("");
  const [sortBy, setSortBy] = useState("dateAsc");

  // ✅ TODO-Liste LADEN (hybridStorage - persistent in %APPDATA%)
  useEffect(() => {
    (async () => {
      try {
        const hybridData = await hybridStorage.get("dashboardTasks");
        const stored = hybridData || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("dashboardTasks") || "null") : null);
        
        if (stored && Array.isArray(stored) && stored.length > 0) {
          setTasks(stored);
        }
      } catch (error) {
        console.error("Fehler beim Laden der Tasks:", error);
        setTasks([]);
      }
    })();
  }, []);

  // ✅ TODO-Liste SPEICHERN (hybridStorage - persistent + GitHub Sync)
  useEffect(() => {
    (async () => {
      try {
        await hybridStorage.set("dashboardTasks", tasks);
        if (typeof window !== "undefined") {
          localStorage.setItem("dashboardTasks", JSON.stringify(tasks));
        }
      } catch (error) {
        console.error('Fehler beim Speichern der Tasks:', error);
      }
    })();
  }, [tasks]);

  const handleAddTask = () => {
    if (!name.trim()) return;
    
    const newTask = {
      id: Date.now().toString(),
      name: name.trim(),
      description: description.trim(),
      notes: notes.trim(),
      status,
      date: date || new Date().toISOString().slice(0, 10),
    };
    
    setTasks([...tasks, newTask]);
    
    setName("");
    setDescription("");
    setNotes("");
    setStatus("offen");
    setDate("");
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
      date: editDate || new Date().toISOString().slice(0, 10),
    } : t));
    setEditId(null);
  };

  const handleCancelEdit = () => {
    setEditId(null);
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

  const exportToExcel = () => {
    if (tasks.length === 0) {
      alert("Keine Aufgaben zum Exportieren vorhanden.");
      return;
    }

    // Bereite die Daten für Excel vor
    const exportData = tasks.map(task => ({
      'Aufgabe': task.name,
      'Beschreibung': task.description,
      'Bemerkungen': task.notes,
      'Status': STATUS_OPTIONS.find(opt => opt.value === task.status)?.label || task.status,
      'Datum': task.date,
      'Erstellt am': new Date(parseInt(task.id)).toLocaleDateString('de-DE')
    }));

    // Erstelle Arbeitsblatt
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Spaltenbreiten anpassen
    const colWidths = [
      { wch: 25 }, // Aufgabe
      { wch: 35 }, // Beschreibung
      { wch: 40 }, // Bemerkungen
      { wch: 15 }, // Status
      { wch: 12 }, // Datum
      { wch: 15 }  // Erstellt am
    ];
    worksheet['!cols'] = colWidths;

    // Erstelle Arbeitsmappe
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Aufgaben");

    // Generiere Dateiname mit aktuellem Datum
    const today = new Date().toISOString().slice(0, 10);
    const filename = `MazerationsMeister_Aufgaben_${today}.xlsx`;

    // Datei herunterladen
    XLSX.writeFile(workbook, filename);
  };

  const exportToPDF = () => {
    if (tasks.length === 0) {
      alert("Keine Aufgaben zum Exportieren vorhanden.");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    
    // Titel
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
    
    // Aufgaben
    doc.setFont("helvetica", "normal");
    sortTasks(tasks, sortBy).forEach((task, idx) => {
      // Zeilenrahmen
      doc.setDrawColor(220, 220, 220);
      doc.rect(20, y - 2, 170, 14, "S");
      
      // Statusfeld mit Farbe
      let statusFill = [255, 255, 255];
      if (task.status === "offen") statusFill = [255, 234, 234];
      if (task.status === "inBearbeitung") statusFill = [255, 251, 229];
      if (task.status === "erledigt") statusFill = [234, 255, 234];
      
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
      
      y += 14 + (maxLines - 1) * 4;
      
      if (y > 270) {
        doc.addPage();
        y = 30;
      }
    });
    
    // Datei speichern
    const today = new Date().toISOString().slice(0, 10);
    doc.save(`MazerationsMeister_Aufgaben_${today}.pdf`);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>To-Do / Projektliste</CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToPDF}
              className="flex items-center gap-2"
              disabled={tasks.length === 0}
            >
              <FileTextIcon size={16} />
              PDF Export
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToExcel}
              className="flex items-center gap-2"
              disabled={tasks.length === 0}
            >
              <DownloadIcon size={16} />
              Excel Export
            </Button>
          </div>
        </div>
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
            {sortTasks(tasks, sortBy).length === 0 && (
              <li className="text-muted-foreground">Keine Aufgaben vorhanden.</li>
            )}
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
                        <Button size="icon" variant="default" onClick={handleSaveEdit} title="Speichern">
                          <SaveIcon size={18} />
                        </Button>
                        <Button size="icon" variant="outline" onClick={handleCancelEdit} title="Abbrechen">
                          <XIcon size={18} />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="font-bold text-primary">{task.name}</div>
                      <div className="text-sm text-muted-foreground">{task.description}</div>
                      <div className="text-xs text-muted-foreground mt-1">{task.notes}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <CalendarIcon size={14} /> {task.date}
                      </div>
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
                        <Button size="icon" variant="outline" onClick={() => handleEditTask(task)} title="Bearbeiten">
                          <PencilIcon size={18} />
                        </Button>
                        <Button size="icon" variant="outline" onClick={() => handleDeleteTask(task.id)} title="Löschen">
                          <Trash2Icon size={18} />
                        </Button>
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
