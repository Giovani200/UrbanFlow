import sharp from "sharp";
import { mkdir } from "node:fs/promises";

// Icône UrbanFlow : point de repère (pin) blanc sur le rouge de marque, dans la zone
// sûre maskable. Un seul SVG source, décliné aux tailles PWA / Apple.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#CC1B36"/>
  <path d="M256 132 C193 132 142 183 142 246 C142 332 256 396 256 396 C256 396 370 332 370 246 C370 183 319 132 256 132 Z" fill="#ffffff"/>
  <circle cx="256" cy="242" r="46" fill="#CC1B36"/>
</svg>`;

const outputDirectory = "public/icons";
await mkdir(outputDirectory, { recursive: true });

const source = Buffer.from(svg);
const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "icon-maskable-512.png", size: 512 },
];

for (const target of targets) {
  await sharp(source).resize(target.size, target.size).png().toFile(`${outputDirectory}/${target.file}`);
  console.log(`généré ${outputDirectory}/${target.file} (${target.size}px)`);
}

await sharp(source).resize(64, 64).png().toFile("src/app/icon.png");
console.log("généré src/app/icon.png (64px)");

await sharp(source).resize(180, 180).png().toFile("src/app/apple-icon.png");
console.log("généré src/app/apple-icon.png (180px)");