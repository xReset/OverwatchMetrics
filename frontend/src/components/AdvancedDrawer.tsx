import React from 'react';
import { Button } from './ui/Button';

interface AdvancedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdvancedDrawer({ isOpen, onClose }: AdvancedDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background border rounded-lg shadow-lg p-6 max-w-md w-full mx-4 z-10">
        <h2 className="text-2xl font-semibold mb-4">Advanced Filters</h2>
        <div className="text-muted-foreground mb-6">
          <p className="mb-2">Coming soon:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Map-specific statistics</li>
            <li>Custom date ranges</li>
            <li>Historical trend analysis</li>
            <li>Data export options</li>
          </ul>
        </div>
        <Button onClick={onClose} className="w-full">
          Close
        </Button>
      </div>
    </div>
  );
}
