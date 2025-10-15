"use client";

/**
 * 📜 BEHÄLTER-HISTORIE UI
 * Timeline-View für alle Bewegungen eines Behälters
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { TankDefinition, ContainerMovement } from '@/schemas/tankSchema';
import { getFormattedMovementHistory } from '@/lib/container-management';

type ContainerHistoryProps = {
  container: TankDefinition;
  onAddNote?: () => void;
};

export function ContainerHistory({ container, onAddNote }: ContainerHistoryProps) {
  const [showAll, setShowAll] = useState(false);
  
  const movements = container.movements || [];
  const displayMovements = showAll ? movements : movements.slice(-5);

  if (movements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📜 Bewegungshistorie</CardTitle>
          <CardDescription>Keine Bewegungen vorhanden</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Sobald dieser Behälter befüllt, versandt oder retour genommen wird, 
            erscheinen hier die Bewegungen.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>📜 Bewegungshistorie</CardTitle>
            <CardDescription>
              {movements.length} {movements.length === 1 ? 'Bewegung' : 'Bewegungen'}
            </CardDescription>
          </div>
          {onAddNote && (
            <Button variant="outline" size="sm" onClick={onAddNote}>
              ➕ Notiz
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayMovements.reverse().map((movement, index) => (
            <MovementItem key={index} movement={movement} />
          ))}

          {movements.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? '▲ Weniger anzeigen' : `▼ Alle ${movements.length} Bewegungen anzeigen`}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type MovementItemProps = {
  movement: ContainerMovement;
};

function MovementItem({ movement }: MovementItemProps) {
  const icon = getMovementIcon(movement.type);
  const color = getMovementColor(movement.type);
  const timestamp = new Date(movement.timestamp).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="flex gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      {/* Icon */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${color}`}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{movement.note}</p>
        <p className="text-xs text-muted-foreground mt-1">{timestamp}</p>
        
        {/* Additional Details */}
        {(movement.amount || movement.product || movement.fromTank) && (
          <div className="flex flex-wrap gap-2 mt-2">
            {movement.amount && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                📊 {movement.amount}L
              </span>
            )}
            {movement.product && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                🍇 {movement.product}
              </span>
            )}
            {movement.fromTank && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                🏺 aus {movement.fromTank}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getMovementIcon(type: ContainerMovement['type']): string {
  const icons = {
    fill: '📥',
    ship: '🚚',
    return: '🔙',
    empty: '🗑️',
    note: '📝'
  };
  return icons[type] || '📌';
}

function getMovementColor(type: ContainerMovement['type']): string {
  const colors = {
    fill: 'bg-green-100 text-green-700',
    ship: 'bg-blue-100 text-blue-700',
    return: 'bg-purple-100 text-purple-700',
    empty: 'bg-gray-100 text-gray-700',
    note: 'bg-yellow-100 text-yellow-700'
  };
  return colors[type] || 'bg-gray-100 text-gray-700';
}
