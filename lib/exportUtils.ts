/**
 * Utility to convert an array of objects to a CSV string and trigger a download.
 * @param data Array of objects to export
 * @param filename Name of the file to download (without extension)
 * @param headers Optional mapping of keys to display headers (e.g., { id: 'Order ID' })
 */
export function downloadCSV(data: any[], filename: string, headers?: Record<string, string>) {
    if (!data || data.length === 0) return;

    // Use headers keys if provided, otherwise use all keys from the first object
    const keys = headers ? Object.keys(headers) : Object.keys(data[0]);

    // Create CSV header row
    const headerRow = keys.map(key => {
        const title = headers ? headers[key] : key;
        return `"${String(title).replace(/"/g, '""')}"`;
    }).join(',');

    // Create CSV data rows
    const dataRows = data.map(row => {
        return keys.map(key => {
            let value = row[key];

            // Handle nested objects (like Joined tables in Supabase)
            if (typeof value === 'object' && value !== null) {
                // If it's a joined record, try to get a sensible field or just JSON it
                value = value.product_name || value.name || JSON.stringify(value);
            }

            // Format value: handle nulls, escape quotes, wrap in quotes
            const cellValue = value === null || value === undefined ? '' : String(value);
            return `"${cellValue.replace(/"/g, '""')}"`;
        }).join(',');
    });

    const csvContent = [headerRow, ...dataRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
