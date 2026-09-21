// Cria a chave de assinatura do app Android, uma vez só. Uso: npm run chave
// Com ela, cada APK novo instala por cima do anterior (sem perder o progresso) e a Play Store aceita o app.
// O que o script faz:
//   1. gera android/violao-diario-upload.jks e android/keystore.properties (com uma senha aleatória);
//   2. se o GitHub CLI (gh) estiver logado, grava a chave nos Secrets do repositório para o GitHub Actions usar.
// Esses dois arquivos ficam fora do git. Guarde uma cópia deles em lugar seguro: sem a chave não dá para atualizar o app.
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const android = join(root, 'android');
const props = join(android, 'keystore.properties');
const jksName = 'violao-diario-upload.jks';
const jks = join(android, jksName);
const alias = 'upload';

if (existsSync(props) || existsSync(jks)) {
  console.error('Já existe uma chave em android/. Não vou substituir: trocar a chave impede atualizar o app.');
  process.exit(1);
}

const exe = process.platform === 'win32' ? 'keytool.exe' : 'keytool';
const javaHome = process.env.JAVA_HOME;
const keytool = javaHome && existsSync(join(javaHome, 'bin', exe)) ? join(javaHome, 'bin', exe) : 'keytool';
const password = randomBytes(24).toString('base64url');
const gen = spawnSync(keytool, ['-genkeypair', '-noprompt', '-keystore', jks, '-storetype', 'PKCS12', '-alias', alias,
  '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000', '-storepass', password, '-keypass', password,
  '-dname', 'CN=Violao Diario, O=Violao Diario, C=BR'], { stdio: ['ignore', 'ignore', 'inherit'] });
if (gen.error || gen.status !== 0) {
  console.error('Não consegui rodar o keytool. Ele vem com o Java (JDK 21): instale o JDK ou defina JAVA_HOME.');
  process.exit(1);
}
writeFileSync(props, `storeFile=${jksName}\nstorePassword=${password}\nkeyAlias=${alias}\nkeyPassword=${password}\n`);
console.log(`Chave criada: android/${jksName} e android/keystore.properties`);

// Secrets do GitHub (para o APK gerado na nuvem sair com esta chave)
const gh = (args, input) => spawnSync('gh', args, { cwd: root, input, encoding: 'utf8' });
if (gh(['auth', 'status']).status !== 0) {
  console.log('GitHub CLI não está logado: os Secrets não foram gravados. Depois de "gh auth login", grave os quatro Secrets (veja o README).');
} else {
  const secrets = {
    ANDROID_KEYSTORE_BASE64: readFileSync(jks).toString('base64'),
    ANDROID_KEYSTORE_PASSWORD: password,
    ANDROID_KEY_ALIAS: alias,
    ANDROID_KEY_PASSWORD: password
  };
  for (const [name, value] of Object.entries(secrets)) {
    const r = gh(['secret', 'set', name], value);
    if (r.status !== 0) { console.error(`Falhou ao gravar o Secret ${name}: ${r.stderr}`); process.exit(1); }
  }
  console.log('Secrets gravados no repositório do GitHub. As próximas compilações saem assinadas.');
}
console.log('\nIMPORTANTE: guarde uma cópia de android/' + jksName + ' e android/keystore.properties fora deste computador.');
