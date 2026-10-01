"""Read only target add-on status/path/PID metadata. No prefs, history or storage."""
import argparse, configparser, datetime, json, subprocess
from pathlib import Path

ID = 'challenge-gate@extension'
parser = argparse.ArgumentParser()
parser.add_argument('--zen-root', type=Path, default=Path.home()/'Library/Application Support/zen')
parser.add_argument('--processes', action='store_true', help='Read PID/start-time/executable metadata with ps; no command-line URLs.')
args = parser.parse_args()
report = {'observedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'addonId': ID, 'profiles': []}
config = configparser.ConfigParser()
config.read(args.zen_root/'profiles.ini')
for section in config.sections():
    if not section.startswith('Profile') or not config.has_option(section, 'Path'):
        continue
    profile = Path(config.get(section, 'Path'))
    if config.get(section, 'IsRelative', fallback='1') == '1':
        profile = args.zen_root/profile
    item = {'profilePath': str(profile), 'metadataPath': str(profile/'extensions.json')}
    try:
        # Only emit the target record's allowlisted non-content metadata.
        addons = json.loads((profile/'extensions.json').read_text()).get('addons', [])
        target = next((a for a in addons if a.get('id') == ID), None)
        item['target'] = None if target is None else {k: target[k] for k in ('id','version','active','userDisabled','appDisabled','signedState','temporarilyInstalled','path','location') if k in target}
        item['metadataMtime'] = (profile/'extensions.json').stat().st_mtime
        item['limitation'] = 'Disk metadata may omit temporary add-ons or lag live state; absence is not proof of removal.'
    except (OSError, ValueError):
        item['status'] = 'Metadata unavailable'
    report['profiles'].append(item)
if args.processes:
    try:
        rows = subprocess.check_output(['ps','-axo','pid=,lstart=,comm='], text=True, stderr=subprocess.DEVNULL)
        report['processes'] = []
        for line in rows.splitlines():
            parts = line.split(None, 6)
            if len(parts) == 7 and parts[6].endswith('/Contents/MacOS/zen'):
                report['processes'].append({'pid': int(parts[0]), 'startedAt': ' '.join(parts[1:6]), 'executablePath': parts[6]})
    except (OSError, subprocess.SubprocessError):
        report['processStatus'] = 'Process metadata unavailable under current permissions'
print(json.dumps(report, indent=2))
