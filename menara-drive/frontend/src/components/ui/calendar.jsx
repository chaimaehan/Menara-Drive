// src/components/ui/calendar.jsx
import React from 'react';

export const Calendar = ({ value, onChange }) => {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border p-2 rounded"
    />
  );
};
