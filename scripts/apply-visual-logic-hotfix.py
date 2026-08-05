from pathlib import Path

path = Path("app/demo/AkteMidasApp.tsx")
text = path.read_text()
old = '''<button className={styles.primaryButton} disabled={!['lobby','round_setup'].includes(view.phase) || busyAction === "configure"} onClick={() => void run("configure", () => controller.configureRound(packageInput()))}>Rundenpaket versiegeln</button>'''
new = '''<button className={styles.primaryButton} disabled={isBusy || !packageCompatible || !['lobby','round_setup'].includes(view.phase)} onClick={() => void run("configure", () => controller.configureRound(packageInput()))}>Rundenpaket versiegeln</button>'''
if old not in text:
    raise SystemExit("Missing configure-button patch target")
path.write_text(text.replace(old, new, 1))

Path(".github/visual-logic-hotfix.request").unlink(missing_ok=True)
Path(__file__).unlink(missing_ok=True)
