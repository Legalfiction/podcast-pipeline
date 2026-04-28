#!/usr/bin/env python3
"""
podcast_server.py - Simpele RSS podcast server voor de Pi
Versie 1.0 - 2026-04-27

Serveert een RSS-feed die Spotify for Creators kan lezen.
Nieuwe .m4a bestanden in ~/aireport/incoming/ verschijnen automatisch in de feed.

Gebruik:
    python3 podcast_server.py

De server draait op poort 8080.
RSS-feed URL: http://[PI-IP]:8080/feed.xml
Audio URL: http://[PI-IP]:8080/audio/[bestandsnaam].m4a
"""

import os
import json
import time
import hashlib
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime, timezone
from email.utils import formatdate

# Configuratie
AUDIO_DIR = Path.home() / "aireport" / "incoming"
STATE_FILE = Path.home() / "spotify-uploader" / "rss_state.json"
PORT = 8080

PODCAST_TITLE = "Aldo's Podcast - AI Report"
PODCAST_DESCRIPTION = "Dagelijkse AI nieuws podcast gebaseerd op de AI Report nieuwsbrief"
PODCAST_LANGUAGE = "nl"
PODCAST_AUTHOR = "Aldo Huizinga"
PODCAST_EMAIL = "aldo.huizinga@gmail.com"
PODCAST_IMAGE = ""  # Optioneel: URL naar podcast artwork


def get_server_ip():
    """Haal het lokale IP-adres op."""
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "localhost"


def get_audio_files():
    """Haal alle .m4a bestanden op, gesorteerd op datum (nieuwste eerst)."""
    if not AUDIO_DIR.exists():
        return []
    
    files = []
    for f in AUDIO_DIR.glob("*.m4a"):
        # Sla test-bestanden over
        if "test" in f.name.lower() or "sync" in f.name.lower():
            continue
        stat = f.stat()
        files.append({
            "path": f,
            "name": f.name,
            "size": stat.st_size,
            "mtime": stat.st_mtime,
        })
    
    # Sorteer op datum, nieuwste eerst
    files.sort(key=lambda x: x["mtime"], reverse=True)
    return files


def filename_to_title(filename):
    """Zet bestandsnaam om naar leesbare titel."""
    # Probeer state.json te lezen voor betere titels
    state = load_state()
    if filename in state.get("titles", {}):
        return state["titles"][filename]
    
    # Fallback: bestandsnaam opschonen
    name = filename.replace(".m4a", "").replace("-", " ").replace("_", " ")
    # Datum patroon: 2026-04-16-ai-report → AI Report (2026-04-16)
    parts = name.split()
    if len(parts) >= 4 and parts[0].isdigit() and len(parts[0]) == 4:
        date = f"{parts[0]}-{parts[1]}-{parts[2]}"
        title = " ".join(parts[3:]).title()
        return f"{title} ({date})"
    return name.title()


def load_state():
    """Laad state bestand."""
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except Exception:
            pass
    return {"titles": {}, "descriptions": {}}


def generate_rss(base_url):
    """Genereer RSS feed XML."""
    files = get_audio_files()
    state = load_state()
    
    items = []
    for f in files[:50]:  # Max 50 afleveringen
        title = filename_to_title(f["name"])
        description = state.get("descriptions", {}).get(f["name"], title)
        
        pub_date = formatdate(f["mtime"], usegmt=True)
        duration_secs = int(f["size"] / 32000)  # Schatting op basis van bestandsgrootte
        duration_str = f"{duration_secs // 60}:{duration_secs % 60:02d}"
        
        audio_url = f"{base_url}/audio/{f['name']}"
        guid = hashlib.md5(f["name"].encode()).hexdigest()
        
        items.append(f"""    <item>
      <title>{title}</title>
      <description>{description}</description>
      <enclosure url="{audio_url}" length="{f['size']}" type="audio/x-m4a"/>
      <guid isPermaLink="false">{guid}</guid>
      <pubDate>{pub_date}</pubDate>
      <itunes:duration>{duration_str}</itunes:duration>
      <itunes:title>{title}</itunes:title>
      <itunes:author>{PODCAST_AUTHOR}</itunes:author>
    </item>""")
    
    items_xml = "\n".join(items)
    
    rss = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>{PODCAST_TITLE}</title>
    <description>{PODCAST_DESCRIPTION}</description>
    <language>{PODCAST_LANGUAGE}</language>
    <link>{base_url}</link>
    <itunes:author>{PODCAST_AUTHOR}</itunes:author>
    <itunes:owner>
      <itunes:name>{PODCAST_AUTHOR}</itunes:name>
      <itunes:email>{PODCAST_EMAIL}</itunes:email>
    </itunes:owner>
    <itunes:explicit>false</itunes:explicit>
    <itunes:category text="Technology"/>
    <lastBuildDate>{formatdate(usegmt=True)}</lastBuildDate>
{items_xml}
  </channel>
</rss>"""
    
    return rss


class PodcastHandler(BaseHTTPRequestHandler):
    
    def log_message(self, format, *args):
        """Minimale logging."""
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {args[0]} {args[1]}")
    
    def do_GET(self):
        ip = get_server_ip()
        base_url = f"http://{ip}:{PORT}"
        
        if self.path == "/" or self.path == "/feed.xml" or self.path == "/rss":
            # RSS Feed
            rss = generate_rss(base_url)
            self.send_response(200)
            self.send_header("Content-Type", "application/rss+xml; charset=utf-8")
            self.send_header("Content-Length", str(len(rss.encode())))
            self.end_headers()
            self.wfile.write(rss.encode())
            
        elif self.path.startswith("/audio/"):
            # Audio bestand serveren
            filename = self.path[7:]  # Strip /audio/
            filepath = AUDIO_DIR / filename
            
            if not filepath.exists() or not filepath.suffix == ".m4a":
                self.send_response(404)
                self.end_headers()
                return
            
            filesize = filepath.stat().st_size
            self.send_response(200)
            self.send_header("Content-Type", "audio/x-m4a")
            self.send_header("Content-Length", str(filesize))
            self.send_header("Accept-Ranges", "bytes")
            self.end_headers()
            
            with open(filepath, "rb") as f:
                while True:
                    chunk = f.read(65536)
                    if not chunk:
                        break
                    try:
                        self.wfile.write(chunk)
                    except BrokenPipeError:
                        break
                        
        elif self.path == "/status":
            # Status pagina
            files = get_audio_files()
            status = {
                "status": "running",
                "feed_url": f"{base_url}/feed.xml",
                "audio_files": len(files),
                "files": [f["name"] for f in files[:10]]
            }
            body = json.dumps(status, indent=2).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()


def main():
    ip = get_server_ip()
    print(f"""
╔══════════════════════════════════════════════════════╗
║         AI Report Podcast RSS Server                  ║
╠══════════════════════════════════════════════════════╣
║  RSS Feed URL:  http://{ip}:{PORT}/feed.xml          
║  Status:        http://{ip}:{PORT}/status            
║                                                       ║
║  Voeg deze RSS URL toe in Spotify for Creators:      ║
║  http://{ip}:{PORT}/feed.xml                        
╚══════════════════════════════════════════════════════╝
""")
    
    files = get_audio_files()
    print(f"Audio bestanden gevonden: {len(files)}")
    for f in files[:5]:
        print(f"  - {f['name']} ({f['size']/1024/1024:.1f} MB)")
    
    print(f"\nServer gestart op poort {PORT}...")
    
    server = HTTPServer(("0.0.0.0", PORT), PodcastHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer gestopt.")


if __name__ == "__main__":
    main()
