import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const internalRuntimeDirectories = [
  'apps/api/src',
  'packages/auth/src',
  'packages/config/src',
  'packages/game-adapters/src',
  'packages/validation/src',
];
const spanishRuntimeText =
  /\b(?:ausente|cada|capturas|caracteres|código|comando|comandos|competidor|competidores|completado|confirmado|cualquier|cualquiera|cuenta|debe|debes|deshabilitado|distinta|disputa|enlaces|equipo|equipos|estado|falta|ganador|hacer|jugador|jugadores|nombre|partida|participante|producción|reporte|resto|resultado|registrados|torneo|usado|usuario)\b/iu;

async function listRuntimeTypeScriptFiles(relativeDirectory) {
  const entries = await readdir(join(workspaceRoot, relativeDirectory), { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = join(relativeDirectory, entry.name);
      if (entry.isDirectory()) return listRuntimeTypeScriptFiles(relativePath);
      if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        return [relativePath];
      }
      return [];
    }),
  );
  return files.flat();
}

test('keeps non-localized runtime messages in English', async () => {
  const internalRuntimeFiles = (
    await Promise.all(internalRuntimeDirectories.map(listRuntimeTypeScriptFiles))
  ).flat();
  const sources = await Promise.all(
    internalRuntimeFiles.map(async (relativePath) => ({
      relativePath,
      source: await readFile(join(workspaceRoot, relativePath), 'utf8'),
    })),
  );

  for (const { relativePath, source } of sources) {
    const match = source.match(spanishRuntimeText);
    assert.equal(match?.[0], undefined, `${relativePath} contains Spanish runtime text`);
  }
});
