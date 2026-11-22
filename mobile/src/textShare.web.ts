export async function shareText(message: string): Promise<void> {
  if (navigator.share) {
    try { await navigator.share({ text: message }); return; }
    catch (error) { if ((error as Error).name === 'AbortError') return; }
  }
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(message); return; }
    catch { /* Download backup if clipboard access is denied. */ }
  }
  const blobUrl = URL.createObjectURL(new Blob([message], { type: 'text/plain;charset=utf-8' }));
  try {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'pluteviral-draft.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally { setTimeout(() => URL.revokeObjectURL(blobUrl), 30000); }
}
