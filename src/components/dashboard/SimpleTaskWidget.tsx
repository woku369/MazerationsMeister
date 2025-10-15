"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarIcon, PlusIcon, CheckIcon } from "lucide-react";

type SimpleTask = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
};

export default function SimpleTaskWidget() {
  const [tasks, setTasks] = useState<SimpleTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // Lade Tasks beim Mount
  useEffect(() => {
    const loadTasks = () => {
      try {
        const saved = localStorage.getItem("simple-tasks");
        if (saved) {
          setTasks(JSON.parse(saved));
        }
      } catch (error) {
        console.error("Fehler beim Laden der Tasks:", error);
      }
    };

    // Nur im Browser ausführen
    if (typeof window !== 'undefined') {
      loadTasks();
    }
  }, []);

  // Speichere Tasks
  const saveTasks = (updatedTasks: SimpleTask[]) => {
    setTasks(updatedTasks);
    if (typeof window !== 'undefined') {
      localStorage.setItem("simple-tasks", JSON.stringify(updatedTasks));
    }
  };

  const addTask = () => {
    if (newTaskTitle.trim()) {
      const newTask: SimpleTask = {
        id: Date.now().toString(),
        title: newTaskTitle.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
      };
      
      saveTasks([...tasks, newTask]);
      setNewTaskTitle("");
    }
  };

  const toggleTask = (taskId: string) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId 
        ? { ...task, completed: !task.completed }
        : task
    );
    saveTasks(updatedTasks);
  };

  const deleteTask = (taskId: string) => {
    saveTasks(tasks.filter(task => task.id !== taskId));
  };

  const completedCount = tasks.filter(task => task.completed).length;
  const totalCount = tasks.length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Aufgaben
          </div>
          <div className="text-sm text-gray-500">
            {completedCount}/{totalCount} erledigt
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Neue Aufgabe hinzufügen */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Neue Aufgabe eingeben..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTask()}
            className="flex-1"
          />
          <Button onClick={addTask} size="sm">
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Tasks Liste */}
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Keine Aufgaben vorhanden. Fügen Sie eine neue Aufgabe hinzu!
            </p>
          ) : (
            tasks.map(task => (
              <div
                key={task.id}
                className={`flex items-center gap-3 p-3 border rounded-lg ${
                  task.completed 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-white border-gray-200'
                }`}
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                    task.completed
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                >
                  {task.completed && <CheckIcon className="h-3 w-3" />}
                </button>
                
                <span 
                  className={`flex-1 ${
                    task.completed 
                      ? 'line-through text-gray-500' 
                      : 'text-gray-900'
                  }`}
                >
                  {task.title}
                </span>
                
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-red-500 hover:text-red-700 text-sm px-2 py-1"
                >
                  Löschen
                </button>
              </div>
            ))
          )}
        </div>

        {/* Statistik */}
        {totalCount > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Gesamt: {totalCount}</span>
              <span>Offen: {totalCount - completedCount}</span>
              <span>Erledigt: {completedCount}</span>
            </div>
            
            {/* Fortschrittsbalken */}
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' 
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
