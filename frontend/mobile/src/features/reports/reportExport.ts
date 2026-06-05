import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

import {
  formatBobCurrency,
} from './reportCalculations';
import type {
  ReportFileType,
  ReportFilters,
  ReportMovement,
  ReportMovementGroup,
  ReportSectionKey,
  ReportSummary,
} from './report.types';

export type GenerateReportFileParams = {
  movements: ReportMovement[];
  summary: ReportSummary;
  groups: ReportMovementGroup[];
  filters: ReportFilters;
  selectedFileType: ReportFileType;
  selectedSections: ReportSectionKey[];
  periodLabel: string;
  startDate: string;
  endDate: string;
};

type ReportRow = {
  Fecha: string;
  Hora: string;
  Tipo: string;
  Titulo: string;
  Categoria: string;
  Cuenta: string;
  Descripcion: string;
  Monto: number;
  Moneda: string;
};

const REPORT_FILE_PREFIX = 'reporte-movimientos';

function getSafeTimestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, '-');
}

function getAccountName(movement: ReportMovement): string {
  return movement.savings_goal_account_names
    || movement.account?.name
    || '';
}

function getMovementTime(movement: ReportMovement): string {
  const createdAt = new Date(movement.created_at);

  if (Number.isNaN(createdAt.getTime())) {
    return '';
  }

  return createdAt.toLocaleTimeString('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getMovementTypeLabel(type: string): string {
  if (type === 'income') {
    return 'Ingreso';
  }

  if (type === 'expense') {
    return 'Gasto';
  }

  return type;
}

function getSignedAmount(movement: ReportMovement): number {
  const amount = Number(movement.amount ?? 0);

  if (movement.type === 'expense') {
    return -amount;
  }

  return amount;
}

function buildReportRows(movements: ReportMovement[]): ReportRow[] {
  return movements.map((movement) => ({
    Fecha: movement.movement_date,
    Hora: getMovementTime(movement),
    Tipo: getMovementTypeLabel(movement.type),
    Titulo: movement.title,
    Categoria: movement.category_name ?? '',
    Cuenta: getAccountName(movement),
    Descripcion: movement.description ?? '',
    Monto: getSignedAmount(movement),
    Moneda: movement.currency ?? 'BOB',
  }));
}

function escapeCsvValue(value: string | number): string {
  const text = String(value ?? '');
  const escapedText = text.replace(/"/g, '""');

  if (/[",\r\n]/.test(escapedText)) {
    return `"${escapedText}"`;
  }

  return escapedText;
}

function buildCsvContent(rows: ReportRow[]): string {
  const headers = [
    'Fecha',
    'Hora',
    'Tipo',
    'Titulo',
    'Categoria',
    'Cuenta',
    'Descripcion',
    'Monto',
    'Moneda',
  ];
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers
      .map((header) => escapeCsvValue(row[header as keyof ReportRow]))
      .join(',')),
  ];

  return `\uFEFF${lines.join('\n')}`;
}

function createFileUri(extension: ReportFileType): string {
  const fileName = `${REPORT_FILE_PREFIX}-${getSafeTimestamp()}.${extension}`;
  const file = new File(Paths.cache, fileName);

  return file.uri;
}

async function shareReportFile(uri: string, mimeType: string): Promise<string> {
  const isSharingAvailable = await Sharing.isAvailableAsync();

  if (!isSharingAvailable) {
    throw new Error('No se puede compartir archivos en este dispositivo.');
  }

  await Sharing.shareAsync(uri, {
    mimeType,
    dialogTitle: 'Compartir reporte de movimientos',
  });

  return uri;
}

function writeTextFile(uri: string, content: string): string {
  const file = new File(uri);
  file.write(content, { encoding: 'utf8' });
  return file.uri;
}

function writeBase64File(uri: string, content: string): string {
  const file = new File(uri);
  file.write(content, { encoding: 'base64' });
  return file.uri;
}

export async function exportReportAsCsv(
  params: GenerateReportFileParams
): Promise<string> {
  const rows = buildReportRows(params.movements);
  const csvContent = buildCsvContent(rows);
  const uri = writeTextFile(createFileUri('csv'), csvContent);

  return shareReportFile(uri, 'text/csv');
}

export async function exportReportAsXlsx(
  params: GenerateReportFileParams
): Promise<string> {
  const workbook = XLSX.utils.book_new();
  const rows = buildReportRows(params.movements);
  const movementSheet = XLSX.utils.json_to_sheet(rows);

  XLSX.utils.book_append_sheet(workbook, movementSheet, 'Movimientos');

  if (params.selectedSections.includes('summary')) {
    const summaryRows = [
      { Campo: 'Total ingresos', Valor: params.summary.totalIncome },
      { Campo: 'Total gastos', Valor: params.summary.totalExpense },
      { Campo: 'Total neto', Valor: params.summary.netTotal },
      { Campo: 'Cantidad de movimientos', Valor: params.summary.movementCount },
      { Campo: 'Fecha inicio', Valor: params.startDate },
      { Campo: 'Fecha fin', Valor: params.endDate },
      { Campo: 'Periodo', Valor: params.periodLabel },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');
  }

  const base64 = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'base64',
  });
  const uri = writeBase64File(createFileUri('xlsx'), base64);

  return shareReportFile(
    uri,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildSummaryHtml(summary: ReportSummary): string {
  return `
    <section>
      <h2>Resumen general</h2>
      <div class="summary-grid">
        <div><span>Ingresos</span><strong>${escapeHtml(formatBobCurrency(summary.totalIncome))}</strong></div>
        <div><span>Gastos</span><strong>${escapeHtml(formatBobCurrency(summary.totalExpense))}</strong></div>
        <div><span>Total neto</span><strong>${escapeHtml(formatBobCurrency(summary.netTotal))}</strong></div>
        <div><span>Movimientos</span><strong>${escapeHtml(summary.movementCount)}</strong></div>
      </div>
    </section>
  `;
}

function buildMovementsHtml(groups: ReportMovementGroup[]): string {
  if (groups.length === 0) {
    return `
      <section>
        <h2>Lista de movimientos</h2>
        <p>No hay movimientos para los filtros seleccionados.</p>
      </section>
    `;
  }

  const groupHtml = groups.map((group) => {
    const rows = group.movements.map((movement) => `
      <tr>
        <td>${escapeHtml(movement.movement_date)}</td>
        <td>${escapeHtml(getMovementTime(movement))}</td>
        <td>${escapeHtml(getMovementTypeLabel(movement.type))}</td>
        <td>${escapeHtml(movement.title)}</td>
        <td>${escapeHtml(movement.category_name ?? 'Sin categoria')}</td>
        <td>${escapeHtml(getAccountName(movement))}</td>
        <td class="amount">${escapeHtml(formatBobCurrency(getSignedAmount(movement)))}</td>
      </tr>
    `).join('');

    return `
      <h3>${escapeHtml(group.label)}</h3>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Tipo</th>
            <th>Titulo</th>
            <th>Categoria</th>
            <th>Cuenta</th>
            <th>Monto</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }).join('');

  return `
    <section>
      <h2>Lista de movimientos</h2>
      ${groupHtml}
    </section>
  `;
}

function buildStatisticsHtml(summary: ReportSummary): string {
  const totalFlow = summary.totalIncome + summary.totalExpense;
  const expenseRatio = totalFlow > 0
    ? (summary.totalExpense / totalFlow) * 100
    : 0;
  const incomeRatio = totalFlow > 0
    ? (summary.totalIncome / totalFlow) * 100
    : 0;

  return `
    <section>
      <h2>Estadisticas basicas</h2>
      <ul>
        <li>Participacion de ingresos: ${escapeHtml(incomeRatio.toFixed(1))}%</li>
        <li>Participacion de gastos: ${escapeHtml(expenseRatio.toFixed(1))}%</li>
        <li>Promedio por movimiento: ${escapeHtml(formatBobCurrency(summary.movementCount > 0 ? Math.abs(summary.netTotal) / summary.movementCount : 0))}</li>
      </ul>
    </section>
  `;
}

function buildCategoriesHtml(movements: ReportMovement[]): string {
  const categoryTotals = new Map<string, number>();

  movements.forEach((movement) => {
    const category = movement.category_name || 'Sin categoria';
    const currentTotal = categoryTotals.get(category) ?? 0;
    categoryTotals.set(category, currentTotal + Math.abs(Number(movement.amount ?? 0)));
  });

  const rows = Array.from(categoryTotals.entries())
    .sort((first, second) => second[1] - first[1])
    .map(([category, total]) => `
      <tr>
        <td>${escapeHtml(category)}</td>
        <td class="amount">${escapeHtml(formatBobCurrency(total))}</td>
      </tr>
    `)
    .join('');

  return `
    <section>
      <h2>Categorias</h2>
      ${rows
        ? `<table><thead><tr><th>Categoria</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>`
        : '<p>No hay categorias para los filtros seleccionados.</p>'}
    </section>
  `;
}

function buildPdfHtml(params: GenerateReportFileParams): string {
  const sections = params.selectedSections;

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            color: #111827;
            font-family: Arial, sans-serif;
            padding: 28px;
          }
          h1 {
            color: #082B8C;
            font-size: 24px;
            margin: 0 0 8px;
          }
          h2 {
            color: #082B8C;
            font-size: 18px;
            margin: 24px 0 10px;
          }
          h3 {
            color: #374151;
            font-size: 14px;
            margin: 16px 0 8px;
          }
          p, li {
            color: #374151;
            font-size: 12px;
          }
          table {
            border-collapse: collapse;
            margin-bottom: 12px;
            width: 100%;
          }
          th, td {
            border: 1px solid #E5E7EB;
            font-size: 10px;
            padding: 7px;
            text-align: left;
          }
          th {
            background: #F3F4F6;
            color: #082B8C;
          }
          .amount {
            text-align: right;
            white-space: nowrap;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .summary-grid div {
            border: 1px solid #E5E7EB;
            border-radius: 6px;
            padding: 10px;
          }
          .summary-grid span {
            color: #6B7280;
            display: block;
            font-size: 11px;
          }
          .summary-grid strong {
            color: #111827;
            display: block;
            font-size: 14px;
            margin-top: 4px;
          }
        </style>
      </head>
      <body>
        <h1>Reporte de movimientos</h1>
        <p><strong>Periodo:</strong> ${escapeHtml(params.periodLabel)}</p>
        <p><strong>Fecha inicio:</strong> ${escapeHtml(params.startDate)} &nbsp; <strong>Fecha fin:</strong> ${escapeHtml(params.endDate)}</p>
        ${sections.includes('summary') ? buildSummaryHtml(params.summary) : ''}
        ${sections.includes('movements') ? buildMovementsHtml(params.groups) : ''}
        ${sections.includes('statistics') ? buildStatisticsHtml(params.summary) : ''}
        ${sections.includes('charts') ? buildCategoriesHtml(params.movements) : ''}
      </body>
    </html>
  `;
}

export async function exportReportAsPdf(
  params: GenerateReportFileParams
): Promise<string> {
  const html = buildPdfHtml(params);
  const { uri } = await Print.printToFileAsync({ html });

  return shareReportFile(uri, 'application/pdf');
}

export async function generateReportFile(
  params: GenerateReportFileParams
): Promise<string> {
  if (params.selectedFileType === 'csv') {
    return exportReportAsCsv(params);
  }

  if (params.selectedFileType === 'xlsx') {
    return exportReportAsXlsx(params);
  }

  return exportReportAsPdf(params);
}
