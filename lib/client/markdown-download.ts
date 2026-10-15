function slug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function downloadMarkdownFile(markdown: string, projectName: string, suffix: string): { filename: string } {
  const filename = `${slug(projectName) || 'project'}-${slug(suffix) || 'markdown'}.md`;
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.appendChild(anchor);

  try {
    anchor.click();
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  } finally {
    anchor.remove();
  }

  // Browsers may start reading the Blob after click() returns; revoking it in the
  // same task can cancel the download on some engines.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
  return { filename };
}
