/**
 * Prepara arquivos antes da troca transacional de banco.
 * Registra o destino ANTES da escrita; assim limpa também um arquivo parcial.
 */
export async function stagePhotos<T extends {id: string; mime_type: string; base64: string}>(
  photos: T[],
  newName: (mime: string) => string,
  write: (filename: string, base64: string) => Promise<void>,
  remove: (filename: string) => Promise<void>,
): Promise<{filenames: Map<string, string>; created: string[]}> {
  const created: string[] = [];
  const filenames = new Map<string, string>();
  try {
    for (const photo of photos) {
      const filename = newName(photo.mime_type);
      created.push(filename);
      await write(filename, photo.base64);
      filenames.set(photo.id, filename);
    }
    return {filenames, created};
  } catch (error) {
    await Promise.allSettled(created.map(remove));
    throw error;
  }
}
