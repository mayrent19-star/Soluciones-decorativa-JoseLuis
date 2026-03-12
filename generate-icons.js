/**
 * Script para generar los iconos PWA.
 * Ejecutar UNA sola vez: node generate-icons.js
 * Requiere: npm install sharp  (solo para correrlo)
 * 
 * Coloca tu logo original en public/icons/logo-original.png (mínimo 512x512)
 * y este script genera todos los tamaños necesarios.
 */
const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const SRC   = path.join(__dirname, 'public/icons/logo-original.png');
const OUT   = path.join(__dirname, 'public/icons');

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

(async () => {
  for (const size of SIZES) {
    await sharp(SRC)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .toFile(path.join(OUT, `icon-${size}.png`));
    console.log(`✅ icon-${size}.png`);
  }
  console.log('\n🎉 Todos los iconos generados en public/icons/');
})();
