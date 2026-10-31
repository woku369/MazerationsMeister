"use client"

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
    /** z.B. eine max-h-Klasse: begrenzt die Höhe, damit die Leisten sichtbar bleiben. */
    viewportClassName?: string
  }
>(({ className, viewportClassName, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className={cn("h-full w-full rounded-[inherit]", viewportClassName)}>
      {children}
    </ScrollAreaPrimitive.Viewport>
    {/* Horizontale Leiste gehört wie die vertikale als eigenständiges
        Geschwisterelement des Viewports (Radix-Vorgabe), nicht als Kind von
        ScrollArea, das über {children} INS Viewport hineingerendert würde -
        genau das war der Fehler, wenn Aufrufer bisher selbst ein zweites
        <ScrollBar orientation="horizontal"> als Kind übergeben haben: der
        Balken erschien, bezog sich aber nicht auf die tatsächliche
        Scroll-Breite und erreichte nie das Tabellenende (Nutzer-Meldung
        30.10.2026: "Scrollbalken umfasst scheinbar nicht alle Spalten").
        Jetzt zentral für alle 4 betroffenen breiten Tabellen behoben. */}
    <ScrollBar />
    <ScrollBar orientation="horizontal" />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

/**
 * Für breite/lange Tabellen: Höhe ans Fenster gebunden, damit die Tabelle in
 * ihrem eigenen Bereich scrollt und der horizontale Balken immer am unteren
 * Rand des sichtbaren Bereichs liegt statt erst am Tabellenende
 * (Nutzer-Meldung 31.10.2026). Mindestens 20rem bei sehr kleinen Fenstern.
 */
export const TABLE_VIEWPORT_CLASS = "max-h-[max(20rem,calc(100vh-15rem))]"

/** Spaltenköpfe bleiben beim vertikalen Scrollen innerhalb der Tabelle stehen. */
export const STICKY_TABLE_HEADER_CLASS = "sticky top-0 z-10 bg-card shadow-[0_1px_0_hsl(var(--border))]"

export { ScrollArea, ScrollBar }
