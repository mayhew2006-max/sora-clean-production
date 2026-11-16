#!/usr/bin/env bash
# Grace Field v13 diagnostic bundle. Existing v12 project and AAB remain unchanged.
set -euo pipefail
ROOT="$HOME/grace-android-native-shell"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
WORK="$HOME/grace-v13-diagnostic-$STAMP"
JAVA="app/src/main/java/com/graceai/assistant/GracePlayBilling.java"
ORIGINAL_SHA="1645281a866a2f6cab5401bf8a9296b32aee016af5605f697ffeaab689fd4a58"
fail() { echo "STOP: $*" >&2; exit 1; }

for file in gradlew app/build.gradle "$JAVA" app/src/main/AndroidManifest.xml; do
  [[ -f "$ROOT/$file" ]] || fail "Missing $ROOT/$file. Nothing changed."
done
[[ "$(sha256sum "$ROOT/$JAVA" | cut -d' ' -f1)" == "$ORIGINAL_SHA" ]] || fail "Android billing file differs from verified V12. Nothing changed."
grep -Eq 'versionCode[[:space:]]+12([[:space:]]|$)' "$ROOT/app/build.gradle" || fail "Expected Android versionCode 12."
grep -Eq 'versionName[[:space:]]+"1\.12\.0"' "$ROOT/app/build.gradle" || fail "Expected Android versionName 1.12.0."
grep -Fq 'applicationId "com.graceai.assistant"' "$ROOT/app/build.gradle" || fail "Unexpected Android package."
grep -Fq 'com.android.billingclient:billing:9.1.0' "$ROOT/app/build.gradle" || fail "Unexpected Billing Library."
grep -Fq 'com.android.vending.BILLING' "$ROOT/app/src/main/AndroidManifest.xml" || fail "Google Billing permission missing."

echo "Verified V12. Creating separate V13 copy..."
mkdir -p "$WORK"
if command -v rsync >/dev/null; then
  rsync -a --exclude='/.gradle/' --exclude='/app/build/' --exclude='/build/' "$ROOT/" "$WORK/"
else
  cp -a "$ROOT/." "$WORK/"
  rm -rf "$WORK/.gradle" "$WORK/app/build" "$WORK/build"
fi
python3 - "$WORK/$JAVA" "$WORK/app/build.gradle" <<'PY'
import pathlib, re, sys
java=pathlib.Path(sys.argv[1]); gradle=pathlib.Path(sys.argv[2])
source=java.read_text()
old='emitError("Google Play Premium is not available. Check that the monthly base plan is active.");'
new='''StringBuilder diagnostics = new StringBuilder("response=" + result.getResponseCode());
                String debug = result.getDebugMessage();
                if (debug != null && !debug.trim().isEmpty())
                    diagnostics.append(" detail=").append(debug.replace('\\n', ' ').replace('\\r', ' '));
                for (com.android.billingclient.api.UnfetchedProduct item : detailsResult.getUnfetchedProductList()) {
                    diagnostics.append(" product=").append(item.getProductId());
                    int status = item.getStatusCode();
                    diagnostics.append(" status=").append(status);
                    if (status == 3) diagnostics.append(" (PRODUCT_NOT_FOUND)");
                    else if (status == 4) diagnostics.append(" (NO_ELIGIBLE_OFFER)");
                    else if (status == 2) diagnostics.append(" (INVALID_PRODUCT_ID_FORMAT)");
                }
                emitError("Google Play lookup: " + diagnostics.toString());'''
if source.count(old)!=1: raise SystemExit('STOP: V12 billing lookup does not match, original unchanged.')
source=source.replace(old,new)
old_offer='emitError("No Google Play monthly subscription offer is active yet.");'
if source.count(old_offer)!=1: raise SystemExit('STOP: V12 offer message does not match.')
source=source.replace(old_offer,'emitError("Google Play returned the product but no eligible subscription offer.");')
java.write_text(source)
s=gradle.read_text()
s,n1=re.subn(r'(versionCode\s+)12\b',r'\g<1>13',s)
s,n2=re.subn(r'(versionName\s+")1\.12\.0(")',r'\g<1>1.13.0\2',s)
if (n1,n2)!=(1,1): raise SystemExit('STOP: version bump failed.')
gradle.write_text(s)
print('Diagnostic code applied to separate V13 project.')
PY

echo "Building Version 13 signed AAB..."
(cd "$WORK" && bash ./gradlew :app:bundleRelease --no-daemon)
AAB="$WORK/app/build/outputs/bundle/release/app-release.aab"
[[ -s "$AAB" ]] || fail 'No AAB was created.'
if command -v jarsigner >/dev/null; then
  jarsigner -verify "$AAB" >/dev/null 2>&1 || fail 'AAB signature verification failed.'
fi
if [[ -f "$HOME/Grace_Field_v12.aab" ]] && command -v keytool >/dev/null; then
  OLD_CERT="$(keytool -printcert -jarfile "$HOME/Grace_Field_v12.aab" 2>/dev/null | grep -m1 'SHA256:' | tr -d '[:space:]' || true)"
  NEW_CERT="$(keytool -printcert -jarfile "$AAB" 2>/dev/null | grep -m1 'SHA256:' | tr -d '[:space:]' || true)"
  [[ -z "$OLD_CERT" || -z "$NEW_CERT" || "$OLD_CERT" == "$NEW_CERT" ]] || fail 'V13 signing certificate differs from V12.'
fi
OUTPUT="$HOME/Grace_Field_V13_Diagnostics_$STAMP.aab"
cp "$AAB" "$OUTPUT"
printf '\nSUCCESS: %s\n' "$OUTPUT"
printf 'Do not upload to Production yet. Start with Internal testing.\n'