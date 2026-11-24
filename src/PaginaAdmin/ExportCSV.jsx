/**
 * ExportCSV — Componente reutilizable para exportar datos a CSV
 * Uso: <ExportCSV data={arrayDeObjetos} headers={cabeceras} filename="archivo" />
 */
function ExportCSV({ data, headers, filename = 'export' }) {
  const handleExport = () => {
    if (!data || data.length === 0) return;

    // Construir cabeceras
    const headerRow = headers.map(h => `"${h.label}"`).join(',');

    // Construir filas
    const rows = data.map(item =>
      headers.map(h => {
        let value = h.accessor(item);
        if (value === null || value === undefined) value = '';
        // Escapar comillas dobles
        value = String(value).replace(/"/g, '""');
        return `"${value}"`;
      }).join(',')
    );

    const csvContent = [headerRow, ...rows].join('\n');

    // BOM para que Excel lea correctamente los acentos
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      className="btn-export-csv"
      onClick={handleExport}
      disabled={!data || data.length === 0}
      title="Exportar a CSV"
    >
      <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Exportar CSV
    </button>
  );
}

export default ExportCSV;
