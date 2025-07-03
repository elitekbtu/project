#!/usr/bin/env node

/**
 * Скрипт для генерации иконок PWA разных размеров
 * Требует установки sharp: npm install sharp
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const sizes = [
  72, 96, 128, 144, 152, 192, 384, 512
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.join(__dirname, '../public/logo.png');
const outputDir = path.join(__dirname, '../public/icons');

// Создаем директорию для иконок, если её нет
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('Генерация иконок PWA...');
  
  for (const size of sizes) {
    try {
      await sharp(inputPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
      
      console.log(`✓ Создана иконка ${size}x${size}`);
    } catch (error) {
      console.error(`✗ Ошибка при создании иконки ${size}x${size}:`, error.message);
    }
  }
  
  console.log('Генерация иконок завершена!');
  
  // Обновляем manifest.json с новыми путями к иконкам
  updateManifest();
}

function updateManifest() {
  const manifestPath = path.join(__dirname, '../public/manifest.json');
  
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    manifest.icons = sizes.map(size => ({
      src: `/icons/icon-${size}x${size}.png`,
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose: size >= 192 ? 'any maskable' : 'any'
    }));
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('✓ Manifest.json обновлен с новыми иконками');
  } catch (error) {
    console.error('✗ Ошибка при обновлении manifest.json:', error.message);
  }
}

// Запускаем генерацию
generateIcons().catch(console.error); 