// npm run android:doctor [-- --adb]: are JDK 21, the Android SDK and the
// Gradle wrapper in place? Prints WC_DOCTOR_* codes (docs/mobile/ANDROID.md).
import { runDoctor } from "./androidTools";

runDoctor(process.argv.includes("--adb"));
