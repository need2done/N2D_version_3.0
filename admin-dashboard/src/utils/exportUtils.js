// Export utility functions for CSV/Excel and PDF reports

/**
 * Download data as Excel-compatible CSV file with UTF-8 BOM
 */
export function exportToExcel(filename, headers, rows, summaryRow = null) {
    if (!rows || !rows.length) {
        alert('No data available to export.');
        return;
    }

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel UTF-8 recognition
    
    // Header Row
    csvContent += headers.map(h => `"${(h || '').toString().replace(/"/g, '""')}"`).join(',') + '\r\n';

    // Data Rows
    rows.forEach(row => {
        const line = row.map(val => `"${(val === null || val === undefined ? '' : val).toString().replace(/"/g, '""')}"`).join(',');
        csvContent += line + '\r\n';
    });

    // Summary Row if provided
    if (summaryRow && summaryRow.length) {
        csvContent += '\r\n';
        csvContent += summaryRow.map(val => `"${(val === null || val === undefined ? '' : val).toString().replace(/"/g, '""')}"`).join(',') + '\r\n';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Generate a formatted, styled PDF print report in a new window
 */
export function exportToPDF(reportTitle, dateRangeText, summaryStats = [], headers = [], rows = []) {
    if (!rows || !rows.length) {
        alert('No data available to export.');
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Pop-up blocked. Please allow pop-ups to view/export PDF report.');
        return;
    }

    const generatedTime = new Date().toLocaleString();

    let statsHtml = '';
    if (summaryStats && summaryStats.length) {
        statsHtml = `
        <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
            ${summaryStats.map(s => `
                <div style="flex: 1; min-width: 150px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">${s.title}</div>
                    <div style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 4px;">${s.value}</div>
                    ${s.subtitle ? `<div style="font-size: 10px; color: #94a3b8;">${s.subtitle}</div>` : ''}
                </div>
            `).join('')}
        </div>
        `;
    }

    let tableHtml = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
        <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                ${headers.map(h => `<th style="text-align: left; padding: 8px 10px; color: #334155; font-weight: 700; text-transform: uppercase; font-size: 10px;">${h}</th>`).join('')}
            </tr>
        </thead>
        <tbody>
            ${rows.map((row, idx) => `
                <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
                    ${row.map(val => `<td style="padding: 8px 10px; color: #1e293b;">${val === null || val === undefined ? '' : val}</td>`).join('')}
                </tr>
            `).join('')}
        </tbody>
    </table>
    `;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${reportTitle} - Need2Done</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 25px; color: #0f172a; }
            h1 { margin: 0 0 5px 0; color: #1d4ed8; font-size: 22px; }
            p { margin: 0; color: #64748b; font-size: 12px; }
            .header-bar { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 20px; }
            .meta { text-align: right; font-size: 11px; color: #64748b; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
            @media print {
                .no-print { display: none !important; }
            }
        </style>
    </head>
    <body>
        <div class="no-print" style="margin-bottom: 15px; text-align: right;">
            <button onclick="window.print()" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">🖨️ Print / Save as PDF</button>
        </div>

        <div class="header-bar">
            <div>
                <h1>Need2Done - ${reportTitle}</h1>
                <p>Period / Filter: <strong>${dateRangeText}</strong></p>
            </div>
            <div class="meta">
                <div>Generated: ${generatedTime}</div>
                <div>System: Need2Done Admin Platform</div>
            </div>
        </div>

        ${statsHtml}
        ${tableHtml}

        <div class="footer">
            Confidential - Need2Done Operational & Financial Data Report • Total Records: ${rows.length}
        </div>

        <script>
            window.onload = function() {
                setTimeout(function() { window.print(); }, 500);
            };
        </script>
    </body>
    </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
}
