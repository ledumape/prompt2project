export async function tryWriteClipboard(value: string, writeText: (value: string) => Promise<void>): Promise<boolean> {
  try {
    await writeText(value);
    return true;
  } catch {
    return false;
  }
}
