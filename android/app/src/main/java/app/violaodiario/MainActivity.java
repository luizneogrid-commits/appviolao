package app.violaodiario;

import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        setIntent(sharedTextAsLink(getIntent())); // antes de o Capacitor ler a intent de abertura
        super.onCreate(savedInstanceState);
        // No tablet (largura mínima de 600 dp) o app gira junto com o aparelho; no celular fica em pé (AndroidManifest.xml).
        if (getResources().getConfiguration().smallestScreenWidthDp >= 600) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_FULL_USER);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(sharedTextAsLink(intent));
    }

    // Texto compartilhado por outro app (menu Compartilhar: uma cifra, por exemplo) vira o link
    // app.violaodiario://musica?texto=...&titulo=..., que o app trata como os outros links (openDeepLink no index.html).
    private static Intent sharedTextAsLink(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return intent;
        String text = intent.getStringExtra(Intent.EXTRA_TEXT);
        if (text == null || text.trim().isEmpty()) return intent;
        if (text.length() > 6000) text = text.substring(0, 6000);
        Uri.Builder link = new Uri.Builder().scheme("app.violaodiario").authority("musica").appendQueryParameter("texto", text);
        String title = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        if (title != null && !title.trim().isEmpty()) link.appendQueryParameter("titulo", title.trim());
        Intent view = new Intent(Intent.ACTION_VIEW, link.build());
        view.setFlags(intent.getFlags());
        return view;
    }
}
