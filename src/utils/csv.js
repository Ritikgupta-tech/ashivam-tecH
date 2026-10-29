/**
 * Frontend Safe CSV Export Utility with Formula Injection Mitigation
 *
 * Prepends apostrophe (') to cells beginning with =, +, -, @, \t, or \r
 * to prevent spreadsheet calculation/execution vulnerabilities (OWASP CSV Injection).
 */

export const sanitizeCsvCell = (val) => {
  if (val === null || val === undefined) {
    return '';
  }
  let str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const exportToCsv = (filename, rows = [], columns = []) => {
  const header = columns.map((col) => sanitizeCsvCell(col.label)).join(',');
  const dataRows = rows.map((row) =>
    columns
      .map((col) => {
        const rawVal = col.transform
          ? col.transform(row)
          : row[col.key] !== undefined && row[col.key] !== null
          ? row[col.key]
          : '';
        return sanitizeCsvCell(rawVal);
      })
      .join(',')
  );

  // Prepend UTF-8 BOM so Excel opens non-ASCII characters without encoding corruption
  const csvContent = '\uFEFF' + [header, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
