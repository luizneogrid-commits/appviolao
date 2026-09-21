// Compila o app Android pela linha de comando, sem abrir o Android Studio.
//   debug   -> APK de teste, para instalar direto no celular        (npm run apk)
//   release -> APK assinado com a sua chave, para distribuir         (npm run apk:release)
//   bundle  -> AAB assinado, o formato que a Play Store pede        (npm run aab)
// O arquivo final é copiado para a pasta dist/.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const android = join(root, 'android');
const mode = process.argv[2] || 'debug';
const TASKS = {
  debug: ['assembleDebug', 'apk/debug/app-debug.apk', '-teste.apk'],
  release: ['assembleRelease', 'apk/release/app-release.apk', '.apk'],
  bundle: ['bundleRelease', 'bundle/release/app-release.aab', '.aab']
};
if (!TASKS[mode]) { console.error(`Modo desconhecido: ${mode}. Use debug, release ou bundle.`); process.exit(1); }
const [task, output, suffix] = TASKS[mode];

if (mode !== 'debug' && !existsSync(join(android, 'keystore.properties'))) {
  console.error('Falta android/keystore.properties com a chave de assinatura. Veja "Publicar nas lojas" no README.');
  process.exit(1);
}

// O Gradle precisa saber onde está o Android SDK: usa ANDROID_HOME ou o lugar padrão do Android Studio.
const localProps = join(android, 'local.properties');
if (!existsSync(localProps) && !process.env.ANDROID_HOME && !process.env.ANDROID_SDK_ROOT) {
  const guesses = [
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
    join(homedir(), 'Library', 'Android', 'sdk'),
    join(homedir(), 'Android', 'Sdk')
  ].filter(Boolean);
  const sdk = guesses.find(p => existsSync(p));
  if (!sdk) {
    console.error('Android SDK não encontrado. Instale o Android Studio (ele traz o SDK) ou defina ANDROID_HOME.');
    process.exit(1);
  }
  writeFileSync(localProps, `sdk.dir=${sdk.replace(/\\/g, '\\\\').replace(/:/g, '\\:')}\n`);
}

const win = process.platform === 'win32';
const r = spawnSync(win ? 'gradlew.bat' : './gradlew', [task], { cwd: android, stdio: 'inherit', shell: win });
if (r.status !== 0) process.exit(r.status ?? 1);

const version = (readFileSync(join(root, 'index.html'), 'utf8').match(/<meta name="app-version" content="([^"]+)"/) || [])[1] || '0';
const src = join(android, 'app', 'build', 'outputs', output);
const dest = join(root, 'dist', `violao-diario-${version}${suffix}`);
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`\nPronto: ${dest}`);
