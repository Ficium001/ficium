package net.ficium.app;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Financial data on screen: block screenshots, screen recording and the
        // recent-apps thumbnail.
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);

        // Overlay ("tapjacking") protection: another app drawing over Ficium could trick the
        // user into a tap they did not mean, such as accepting an offer.
        // Android 12+: other apps' overlays are hidden while Ficium is on screen.
        // Android 10-11: a touch that arrives while the window is covered is ignored.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            getWindow().setHideOverlayWindows(true);
        }
        getWindow().getDecorView().setFilterTouchesWhenObscured(true);
    }
}
