# R8 rules for the release build (minifyEnabled true in build.gradle).
#
# Capacitor core ships consumer rules that keep every Plugin subclass and its
# @PluginMethod / callback methods, which covers all plugins in this app. Only
# app-specific additions belong here.

# Readable crash stack traces: keep line numbers, hide original file names.
# The mapping file is uploaded as a release artifact for de-obfuscation.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# The WebView bridge is reached from JavaScript by name.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
