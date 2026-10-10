/**
 * Filtert Transaktionen nach einem Datumsbereich (jeweils optional).
 *
 * Als eigene, pure Funktion ausgelagert statt inline im Komponenten-useMemo
 * zu bleiben - genau hier saß ein konkreter, folgenschwerer Bug (Nutzer-
 * Meldung 10.10.2026: "ich musste auf 'Filter zurücksetzen' klicken, um alle
 * Buchungen zu sehen"): `transactionDate` kommt über localStorage
 * (JSON.parse ohne Reviver) zur Laufzeit tatsächlich als ISO-STRING an, nicht
 * als echtes Date-Objekt, obwohl der Typ `InventoryTransaction` das
 * behauptet. Ein Vergleich `"...Z" >= new Date(...)` wird in JavaScript über
 * ToPrimitive(Date, "number") → Zahl, dann ToNumber(string) → NaN aufgelöst -
 * jeder Vergleich mit NaN ist `false`. Der Von/Bis-Filter hat dadurch bisher
 * IMMER alle Einträge ausgeblendet, sobald ein Datum gesetzt war - erklärt
 * rückwirkend auch die ungeklärte "leeres Journal"-Beobachtung aus
 * Aufgabe 87, die fälschlich auf Sync/Timing geschoben wurde: der neue
 * Default-Datumsfilter aus Aufgabe 86 hat diesen vorher nie aktiv genutzten
 * Codepfad erstmals ständig ausgelöst. `new Date(...)` auf beiden Seiten
 * macht den Vergleich unabhängig davon korrekt, ob `transactionDate` zur
 * Laufzeit ein String oder ein echtes Date-Objekt ist.
 */
export function filterTransactionsByDateRange<T extends { transactionDate: Date | string }>(
  items: T[],
  dateFrom: string,
  dateTo: string,
): T[] {
  let result = items;
  if (dateFrom) {
    const von = new Date(dateFrom).getTime();
    result = result.filter(item => new Date(item.transactionDate).getTime() >= von);
  }
  if (dateTo) {
    // Ende des Tages, damit der "bis"-Tag selbst noch eingeschlossen ist.
    const bis = new Date(dateTo);
    bis.setHours(23, 59, 59, 999);
    const bisTime = bis.getTime();
    result = result.filter(item => new Date(item.transactionDate).getTime() <= bisTime);
  }
  return result;
}
