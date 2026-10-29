/**
 * Safe CSV Serializer with Formula Injection (CSV Injection / DDE) Mitigation
 *
 * In accordance with OWASP security guidance:
 * Cells beginning with =, +, -, @, \t, or \r can trigger command or formula execution
 * when opened in spreadsheet programs (e.g. Microsoft Excel, LibreOffice Calc, Google Sheets).
 * Such cells are prepended with an apostrophe (') to neutralize formula evaluation.
 */

export const sanitizeCsvCell = (val) => {
  if (val === null || val === undefined) {
    return "";
  }
  let str = String(val);
  // Neutralize formula injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  // Escape embedded double quotes and wrap in quotes if containing delimiter, quotes, or newlines
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const toCsv = (rows = [], columns = []) => {
  const header = columns.map((col) => sanitizeCsvCell(col.label)).join(",");
  const dataRows = rows.map((row) =>
    columns
      .map((col) => {
        const rawVal = col.transform
          ? col.transform(row)
          : row[col.key] !== undefined && row[col.key] !== null
          ? row[col.key]
          : "";
        return sanitizeCsvCell(rawVal);
      })
      .join(",")
  );
  return [header, ...dataRows].join("\r\n");
};
