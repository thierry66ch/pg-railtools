/**
 * Utilitaires bas niveau de téléchargement / lecture de fichiers côté navigateur.
 * Réutilisés par la gestion de projets, l'export/import en vrac, et les exports de résultats.
 */

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function downloadJsonFile(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(filename, blob);
}

export function downloadTextFile(filename: string, text: string, mimeType = 'text/plain'): void {
  const blob = new Blob([text], { type: mimeType });
  downloadBlob(filename, blob);
}

export function readJsonFile<T>(file: File): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string) as T);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read file'));
    reader.readAsText(file);
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read blob'));
    reader.readAsDataURL(blob);
  });
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
