package app.violaodiario;

import android.content.pm.ActivityInfo;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Tablet (largura mínima de 600 dp): rotação livre, porque o layout largo do app funciona deitado.
        // Celular continua em retrato, como está no manifesto.
        if (getResources().getConfiguration().smallestScreenWidthDp >= 600) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_FULL_USER);
        }
    }
}
