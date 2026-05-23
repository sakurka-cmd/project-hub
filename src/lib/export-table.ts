export function openExportTable(
  branchName: string,
  columns: string[],
  rows: Record<string, unknown>[]
): void {
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  const headerCells = columns
    .map((col) => `<th style="padding: 10px 16px; text-align: left; font-weight: 600; background: #f8fafc; border-bottom: 2px solid #e2e8f0; white-space: nowrap; color: #334155;">${escapeHtml(col)}</th>`)
    .join('');

  const bodyRows = rows
    .map((row, idx) => {
      const bgColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const cells = columns
        .map((col) => {
          const value = row[col] ?? '';
          const display = typeof value === 'object' ? JSON.stringify(value) : String(value);
          return `<td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #475569;">${escapeHtml(display)}</td>`;
        })
        .join('');
      return `<tr style="background: ${bgColor};">${cells}</tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Экспорт: ${escapeHtml(branchName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #ffffff;
      color: #1e293b;
      padding: 32px;
    }
    .header {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e2e8f0;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
    }
    .header p {
      font-size: 14px;
      color: #64748b;
      margin-top: 4px;
    }
    .table-wrapper {
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    tr:hover td {
      background: #f1f5f9 !important;
    }
    .meta {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Экспорт: ${escapeHtml(branchName)}</h1>
    <p>Экспортировано ${rows.length} записей с ${columns.length} колонками</p>
  </div>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>${headerCells}</tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
  </div>
  <div class="meta">ProjectHub — ${new Date().toLocaleString('ru-RU')}</div>
</body>
</html>`;

  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(html);
    newWindow.document.close();
  }
}
