import React from 'react';


export function parseDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  
  if (typeof dateInput === 'string') {
    let str = dateInput.trim();
    // If it's a MySQL datetime "YYYY-MM-DD HH:MM:SS" with no timezone offset or Z, treat as UTC
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(str) && !str.includes('Z') && !str.includes('+') && !str.includes('-', 10)) {
      str = str.replace(' ', 'T') + 'Z';
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  
  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? null : d;
}

export function formatTimeIST(dateInput, options = {}) {
  const d = parseDate(dateInput);
  if (!d) return String(dateInput || '');
  return d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: options.includeSeconds !== false ? '2-digit' : undefined,
    hour12: true,
    ...options
  });
}

export function formatDateIST(dateInput, options = {}) {
  const d = parseDate(dateInput);
  if (!d) return String(dateInput || '');
  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options
  });
}

export function formatDateTimeIST(dateInput, options = {}) {
  const d = parseDate(dateInput);
  if (!d) return String(dateInput || '');
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: options.includeSeconds ? '2-digit' : undefined,
    hour12: true,
    ...options
  });
}

export function formatOrderDateTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = parseDate(dateStr);
    if (!d) return String(dateStr);

    const now = new Date();
    const optionsDate = { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric', day: 'numeric' };
    const dISTString = d.toLocaleDateString('en-CA', optionsDate); // 'YYYY-MM-DD'
    const nowISTString = now.toLocaleDateString('en-CA', optionsDate);
    
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayISTString = yesterday.toLocaleDateString('en-CA', optionsDate);

    const isToday = dISTString === nowISTString;
    const isYesterday = dISTString === yesterdayISTString;

    const timeStr = d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    if (isToday) {
      return (
        <span>
          <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.72rem', background: '#ecfdf5', padding: '1px 5px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>Today</span>
          <br />
          <small style={{ color: 'var(--text-muted)' }}>{timeStr}</small>
        </span>
      );
    } else if (isYesterday) {
      return (
        <span>
          <span style={{ color: '#d97706', fontWeight: 700, fontSize: '0.72rem', background: '#fffbeb', padding: '1px 5px', borderRadius: '4px', border: '1px solid #fde68a' }}>Yesterday</span>
          <br />
          <small style={{ color: 'var(--text-muted)' }}>{timeStr}</small>
        </span>
      );
    } else {
      const dateFormatted = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' });
      return (
        <span>
          <span style={{ color: '#475569', fontWeight: 700, fontSize: '0.72rem', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>{dateFormatted}</span>
          <br />
          <small style={{ color: 'var(--text-muted)' }}>{timeStr}</small>
        </span>
      );
    }
  } catch (e) {
    return String(dateStr);
  }
}
