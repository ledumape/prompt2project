import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadMarkdownFile } from '../lib/client/markdown-download';

describe('Markdown download', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('downloads the exact Portuguese content with the localized spec filename', async () => {
    vi.useFakeTimers();
    const blobUrls: Blob[] = [];
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      blobUrls.push(blob as Blob);
      return 'blob:project-spec';
    });
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const result = downloadMarkdownFile('# Especificação do projeto\n\nResumo.', 'Escolha de filmes', 'especificacao');

    expect(result.filename).toBe('escolha-de-filmes-especificacao.md');
    expect(createUrl).toHaveBeenCalledOnce();
    expect(blobUrls[0]?.type).toBe('text/markdown;charset=utf-8');
    await expect(blobUrls[0]?.text()).resolves.toBe('# Especificação do projeto\n\nResumo.');
    expect(click).toHaveBeenCalledOnce();
    expect(revokeUrl).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1_000);
    expect(revokeUrl).toHaveBeenCalledWith('blob:project-spec');
  });

  it('normalizes accented project names in English prompt filenames', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:coding-prompt');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    expect(downloadMarkdownFile('# Build this idea', 'Café à noite', 'coding-prompt').filename)
      .toBe('cafe-a-noite-coding-prompt.md');
  });
});
