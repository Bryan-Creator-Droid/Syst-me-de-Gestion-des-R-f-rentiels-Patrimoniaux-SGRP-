import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

interface CompressResult {
  filename: string;
  path: string;
  size: number;
}

// -----------------------------------------------------------
// FONCTION : compressImage
// Prend le fichier original, retourne le fichier compressé
// -----------------------------------------------------------
export const compressImage = async (originalPath: string, originalName: string): Promise<CompressResult> => {

  // Nom du fichier compressé — même nom, extension .webp
  const compressedName = originalName.replace(path.extname(originalName), '.webp');
  const compressedPath = `src/uploads/compressed/${compressedName}`;

  await sharp(originalPath)
    .resize(1200, 1200, {
      fit: 'inside',        // garde les proportions, ne dépasse pas 1200x1200
      withoutEnlargement: true, // ne grossit pas une petite image
    })
    .webp({ quality: 80 }) // convertit en WebP, qualité 80%
    .toFile(compressedPath);

  // Supprimer l'original après compression
  fs.unlinkSync(originalPath);

  const stats = fs.statSync(compressedPath);

  return {
    filename: compressedName,
    path: compressedPath,
    size: stats.size,
  };
};