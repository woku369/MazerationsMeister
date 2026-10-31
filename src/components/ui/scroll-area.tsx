"use client"

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

/** Abstand unter der Tabelle bis zum Fensterrand: Kartenpolster + Seitenpolster. */
const FIT_BOTTOM_GAP_PX = 64
/** Untergrenze, damit die Tabelle bei sehr kleinen Fenstern nicht verschwindet. */
const FIT_MIN_HEIGHT_PX = 240

/**
 * Misst, wo der Bereich auf der Seite beginnt, und begrenzt seine Höhe so,
 * dass er (bei ganz nach oben gescrollter Seite) genau am unteren
 * Fensterrand endet. Eine feste Pauschale wie "Fensterhöhe minus 15rem"
 * reichte nicht: was über der Tabelle liegt (Kopfzeile, Import, Tabs,
 * Kartenkopf), ist je nach Seite unterschiedlich hoch - der horizontale
 * Balken lag dann trotzdem unterhalb des Fensters (Nutzer-Meldung 31.10.2026).
 */
function useFitToWindowHeight(enabled: boolean) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [maxHeight, setMaxHeight] = React.useState<number | undefined>(undefined)

  React.useLayoutEffect(() => {
    if (!enabled) return
    const update = () => {
      const el = ref.current
      if (!el) return
      const topOnPage = el.getBoundingClientRect().top + window.scrollY
      setMaxHeight(Math.max(FIT_MIN_HEIGHT_PX, Math.floor(window.innerHeight - topOnPage - FIT_BOTTOM_GAP_PX)))
    }
    update()
    window.addEventListener("resize", update)
    // Inhalt darüber kann sich nachträglich ändern (z.B. Warnhinweise,
    // umbrechende Buttons) - dann neu messen.
    const observer = new ResizeObserver(update)
    observer.observe(document.body)
    return () => {
      window.removeEventListener("resize", update)
      observer.disconnect()
    }
  }, [enabled])

  return { ref, maxHeight }
}

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
    /**
     * Für lange, breite Tabellen: Höhe bis zum unteren Fensterrand begrenzen,
     * damit die Tabelle im eigenen Bereich scrollt und der horizontale Balken
     * immer sichtbar ist statt erst am Tabellenende.
     */
    fitToWindow?: boolean
  }
>(({ className, fitToWindow = false, children, ...props }, ref) => {
  const { ref: viewportRef, maxHeight } = useFitToWindowHeight(fitToWindow)
  return (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport
      ref={viewportRef}
      className="h-full w-full rounded-[inherit]"
      style={fitToWindow && maxHeight !== undefined ? { maxHeight } : undefined}
    >
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
  )
})
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
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-muted-foreground/40 hover:bg-muted-foreground/60" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

/** Spaltenköpfe bleiben beim vertikalen Scrollen innerhalb der Tabelle stehen. */
export const STICKY_TABLE_HEADER_CLASS = "sticky top-0 z-10 bg-card shadow-[0_1px_0_hsl(var(--border))]"

export { ScrollArea, ScrollBar }
