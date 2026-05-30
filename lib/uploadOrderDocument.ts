import { supabase } from "@/lib/supabaseClient";

export async function uploadOrderDocument(
    file: File,
    orderId: string,
    folder: string = 'return-labels'
): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('orderId', orderId);
    formData.append('folder', folder);

    const response = await fetch('/api/orders/upload', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
    }

    const data = await response.json();
    return data.url;
}
