// PDF Export using print
export const exportToPDF = (title: string, content: HTMLElement) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            padding: 40px;
            max-width: 1200px;
            margin: 0 auto;
          }
          h1 { font-size: 24px; margin-bottom: 20px; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left; 
          }
          th { background-color: #f5f5f5; font-weight: 600; }
          tr:nth-child(even) { background-color: #fafafa; }
          .summary { 
            margin-top: 20px; 
            padding: 15px; 
            background: #f5f5f5; 
            border-radius: 8px; 
          }
          .metric { 
            display: inline-block; 
            margin-right: 30px; 
            margin-bottom: 10px; 
          }
          .metric-label { font-size: 12px; color: #666; }
          .metric-value { font-size: 18px; font-weight: bold; }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        ${content.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};

// Simple PDF export with table data
export const exportTableToPDF = (title: string, headers: string[], rows: (string | number)[][]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const tableHTML = `
    <table>
      <thead>
        <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>
  `;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            padding: 40px;
            max-width: 1200px;
            margin: 0 auto;
          }
          h1 { font-size: 24px; margin-bottom: 20px; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left; 
          }
          th { background-color: #f5f5f5; font-weight: 600; }
          tr:nth-child(even) { background-color: #fafafa; }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        ${tableHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};

// Simple Excel/CSV export with table data
export const exportTableToExcel = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const headerRow = headers.join(',');
  const dataRows = rows.map(row => 
    row.map(cell => {
      const value = String(cell);
      if (value.includes(',') || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );

  const csvContent = [headerRow, ...dataRows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  
  URL.revokeObjectURL(url);
};

// Excel/CSV Export with column definitions
export const exportToExcel = (filename: string, data: any[], columns: { key: string; header: string }[]) => {
  const headers = columns.map(c => c.header).join(',');
  const rows = data.map(row => 
    columns.map(c => {
      let value = row[c.key];
      // Handle nested objects
      if (c.key.includes('.')) {
        const keys = c.key.split('.');
        value = keys.reduce((obj, key) => obj?.[key], row);
      }
      // Escape commas and quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    }).join(',')
  );

  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  
  URL.revokeObjectURL(url);
};

// Generate report data for export
export interface ReportData {
  summary: {
    label: string;
    value: string | number;
  }[];
  tableData: any[];
  columns: { key: string; header: string }[];
}

export const generateReportHTML = (report: ReportData): HTMLDivElement => {
  const container = document.createElement('div');
  
  // Summary section
  const summaryDiv = document.createElement('div');
  summaryDiv.className = 'summary';
  report.summary.forEach(item => {
    summaryDiv.innerHTML += `
      <div class="metric">
        <div class="metric-label">${item.label}</div>
        <div class="metric-value">${item.value}</div>
      </div>
    `;
  });
  container.appendChild(summaryDiv);

  // Table section
  if (report.tableData.length > 0) {
    const table = document.createElement('table');
    
    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>${report.columns.map(c => `<th>${c.header}</th>`).join('')}</tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    report.tableData.forEach(row => {
      const tr = document.createElement('tr');
      report.columns.forEach(col => {
        let value = row[col.key];
        if (col.key.includes('.')) {
          const keys = col.key.split('.');
          value = keys.reduce((obj, key) => obj?.[key], row);
        }
        tr.innerHTML += `<td>${value ?? '-'}</td>`;
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    
    container.appendChild(table);
  }

  return container;
};