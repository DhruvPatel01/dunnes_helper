#!/usr/bin/env python3
"""Run regression tests in an isolated headless Chrome using only installed tools."""
import argparse
import json
import os
from pathlib import Path
import select
import shutil
import signal
import subprocess
import sys
import tempfile
import time

ROOT = Path(__file__).resolve().parent.parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backup', type=Path, help='Also check an existing JSON export (read only)')
    args = parser.parse_args()
    chrome = os.environ.get('CHROME_BIN') or shutil.which('google-chrome-stable') or shutil.which('chromium') or shutil.which('google-chrome')
    if not chrome:
        parser.error('Chrome/Chromium must be installed, or set CHROME_BIN to its path')
    with tempfile.TemporaryDirectory(prefix='dunnes-tests-') as temporary:
        directory = Path(temporary)
        build = """
import { build } from 'vite';
import vue from '@vitejs/plugin-vue';
await build({ configFile: false, logLevel: 'error', plugins: [vue()],
  define: { 'process.env.NODE_ENV': JSON.stringify('test') },
  build: { outDir: process.argv[1], emptyOutDir: false, minify: false,
    lib: { entry: 'tests/browser.test.ts', name: 'DunnesTests', formats: ['iife'], fileName: () => 'tests.js' } }
});
"""
        subprocess.run(['node', '--input-type=module', '-e', build, str(directory)], cwd=ROOT, check=True)
        backup = json.loads(args.backup.read_text()) if args.backup else None
        payload = json.dumps(backup).replace('<', '\\u003c')
        (directory / 'index.html').write_text(f'<!doctype html><meta charset="utf-8"><body><script>window.__backup={payload}</script><script src="tests.js"></script>')
        request_read, request_write = os.pipe()
        response_read, response_write = os.pipe()
        log_path = directory / 'chrome.log'
        with log_path.open('w') as log:
            # CDP uses file descriptors 3 and 4; no server, ports, or extra Python packages.
            actions = [(os.POSIX_SPAWN_DUP2, request_read, 3), (os.POSIX_SPAWN_DUP2, response_write, 4),
                       (os.POSIX_SPAWN_DUP2, log.fileno(), 1), (os.POSIX_SPAWN_DUP2, log.fileno(), 2)]
            command = [chrome, '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
                       '--disable-background-networking', '--disable-component-update', '--disable-extensions',
                       '--remote-debugging-pipe', f'--user-data-dir={directory / "profile"}', 'about:blank']
            pid = os.posix_spawn(chrome, command, os.environ, file_actions=actions, setpgroup=0)
        os.close(request_read)
        os.close(response_write)
        pending = b''
        next_id = 0

        def call(method, params=None, session=None):
            nonlocal pending, next_id
            next_id += 1
            message = {'id': next_id, 'method': method, 'params': params or {}}
            if session:
                message['sessionId'] = session
            os.write(request_write, json.dumps(message).encode() + b'\0')
            deadline = time.monotonic() + 60
            while time.monotonic() < deadline:
                while b'\0' in pending:
                    raw, pending = pending.split(b'\0', 1)
                    response = json.loads(raw)
                    if response.get('id') == next_id:
                        if 'error' in response:
                            raise RuntimeError(response['error'])
                        return response.get('result', {})
                if select.select([response_read], [], [], 1)[0]:
                    chunk = os.read(response_read, 1048576)
                    if not chunk:
                        raise RuntimeError('Chrome exited: ' + log_path.read_text()[-3000:])
                    pending += chunk
            raise TimeoutError(f'Timed out waiting for {method}: ' + log_path.read_text()[-3000:])

        try:
            target = call('Target.createTarget', {'url': 'about:blank'})['targetId']
            session = call('Target.attachToTarget', {'targetId': target, 'flatten': True})['sessionId']
            call('Emulation.setTimezoneOverride', {'timezoneId': 'Europe/Dublin'}, session)
            call('Page.navigate', {'url': (directory / 'index.html').as_uri()}, session)
            result = call('Runtime.evaluate', {
                'expression': 'new Promise(resolve => { const t = setInterval(() => { if(window.__testResults) { clearInterval(t); window.__testResults.then(resolve); } }, 20); })',
                'awaitPromise': True, 'returnByValue': True
            }, session)
            if 'exceptionDetails' in result:
                raise RuntimeError(result['exceptionDetails'])
            results = result['result']['value']
            for test in results:
                print(('PASS ' if test['passed'] else 'FAIL ') + test['name'])
                if not test['passed']:
                    print(test['error'])
            failed = sum(not test['passed'] for test in results)
            print(f'\n{len(results) - failed}/{len(results)} tests passed')
            return 1 if failed else 0
        finally:
            try:
                call('Browser.close')
            except (RuntimeError, OSError, TimeoutError):
                pass
            try:
                os.killpg(pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
            os.waitpid(pid, 0)
            os.close(request_write)
            os.close(response_read)


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (RuntimeError, TimeoutError, subprocess.CalledProcessError) as error:
        print(error, file=sys.stderr)
        sys.exit(1)
