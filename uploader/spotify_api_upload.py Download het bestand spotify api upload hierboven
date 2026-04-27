#!/usr/bin/env python3
"""
spotify_api_upload.py - Directe Spotify/Anchor API upload zonder browser
Versie 2.0 - 2026-04-23 (GraphQL + REST, geen Puppeteer)
"""

import argparse
import json
import os
import sys
import time
import requests
from pathlib import Path

SHOW_ID = "1JRx4Z48nZffC968ltkDit"
ANCHOR_API = "https://api-v5.anchor.fm/v3"
GRAPH_API = "https://creators-graph.spotify.com/v2/graph-pq"

# Cookie string van Windows Chrome sessie
COOKIE_STRING = "sss=1; sp_t=9e5730f9-8b12-4d4d-bf06-f946a91d6f12; _tt_enable_cookie=1; LPSID-2422064=XgYCxY4DQcGDkZrgaN-v-A; __stripe_mid=a5560122-2e17-4268-bec5-0615650fc3b2973a27; sp_key=87e9159e-1e39-4137-938b-2c4503b9fc1f; _fbp=fb.1.1776539429781.279133158602105206; sp_window_session=true; _hjSession_3893126=eyJpZCI6IjMzNjViM2Q3LWU0OWMtNDA1OC1hMmU3LTI1YzAyMGFmZmM3MCIsImMiOjE3NzY5NDc2NTA5MjYsInMiOjAsInIiOjAsInNiIjowLCJzciI6MCwic2UiOjAsImZzIjowLCJzcCI6MH0=; ab.storage.deviceId.91ac64b1-3e86-476a-9953-ccba0370c1d6=g%3Aea0834e7-0301-9dff-05ba-3e2ab8ba396c%7Ce%3Aundefined%7Cc%3A1775723078536%7Cl%3A1776951666367; ab.storage.userId.91ac64b1-3e86-476a-9953-ccba0370c1d6=g%3A00f54eae47ec34015fd162832d91a9483f9072f2c89389ad137c72%7Ce%3Aundefined%7Cc%3A1775723078526%7Cl%3A1776951666368; __stripe_sid=17bfb46f-f5f5-4c7f-aa19-789b44f822d0721eab; LPSID-2422064=XgYCxY4DQcGDkZrgaN-v-A; _ga=GA1.2.1399262624.1775722890; ab.storage.sessionId.91ac64b1-3e86-476a-9953-ccba0370c1d6=g%3A05cbfe96-2f06-45d8-a055-3b5da33c029b%7Ce%3A1776956252039%7Cc%3A1776951666365%7Cl%3A1776954452039"

def parse_cookie_string(cookie_str):
    """Zet cookie string om naar dict."""
    cookies = {}
    for part in cookie_str.split(';'):
        part = part.strip()
        if '=' in part:
            name, _, value = part.partition('=')
            cookies[name.strip()] = value.strip()
    return cookies

def get_signed_url(session, filename):
    """Vraag een pre-signed upload URL op."""
    url = f"{ANCHOR_API}/podcast/{SHOW_ID}/episodes/signedUploadUrl"
    params = {'filename': filename}
    
    resp = session.get(url, params=params)
    print(f"Get signed URL: {resp.status_code}", file=sys.stderr)
    
    if resp.status_code != 200:
        # Probeer alternatief endpoint
        url2 = f"{ANCHOR_API}/podcast/{SHOW_ID}/upload/signedUrl"
        resp = session.get(url2, params=params)
        print(f"Alt signed URL: {resp.status_code}", file=sys.stderr)
    
    if resp.status_code == 200:
        data = resp.json()
        print(f"Signed URL response: {json.dumps(data)[:200]}", file=sys.stderr)
        return data
    
    print(f"Response: {resp.text[:500]}", file=sys.stderr)
    return None

def upload_to_s3(signed_url, audio_path):
    """Upload audio naar S3."""
    size = os.path.getsize(audio_path)
    print(f"Uploading {size/1024/1024:.1f} MB to S3...", file=sys.stderr)
    
    with open(audio_path, 'rb') as f:
        resp = requests.put(
            signed_url, 
            data=f,
            headers={'Content-Type': 'audio/x-m4a', 'Content-Length': str(size)}
        )
    print(f"S3 upload: {resp.status_code}", file=sys.stderr)
    return resp.status_code in (200, 204)

def create_episode_graphql(session, title, description, audio_url):
    """Maak episode aan via GraphQL."""
    query = """
    mutation CreateEpisode($input: CreateEpisodeInput!) {
        createEpisode(input: $input) {
            episode {
                id
                title
                publishedAt
            }
        }
    }
    """
    
    variables = {
        "input": {
            "podcastId": SHOW_ID,
            "title": title,
            "description": description,
            "audioUrl": audio_url,
            "episodeType": "FULL",
            "explicit": False,
            "publishNow": True
        }
    }
    
    resp = session.post(GRAPH_API, json={"query": query, "variables": variables})
    print(f"GraphQL create: {resp.status_code}", file=sys.stderr)
    print(f"Response: {resp.text[:500]}", file=sys.stderr)
    return resp.json() if resp.status_code == 200 else None

def create_episode_rest(session, title, description, upload_key):
    """Maak episode aan via REST API."""
    # Probeer meerdere endpoints
    endpoints = [
        f"{ANCHOR_API}/podcast/{SHOW_ID}/episodes",
        f"{ANCHOR_API}/episodes",
        f"https://api-v5.anchor.fm/v3/podcast/{SHOW_ID}/episodes/uploadedAudio",
    ]
    
    payload = {
        "podcastId": SHOW_ID,
        "title": title,
        "description": description,
        "contentUploadKey": upload_key,
        "type": "full",
        "explicit": False,
        "publishNow": True
    }
    
    for endpoint in endpoints:
        resp = session.post(endpoint, json=payload)
        print(f"REST {endpoint}: {resp.status_code}", file=sys.stderr)
        if resp.status_code in (200, 201):
            print(f"Response: {resp.text[:300]}", file=sys.stderr)
            return resp.json()
        print(f"Response: {resp.text[:200]}", file=sys.stderr)
    
    return None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--audio', required=True)
    parser.add_argument('--title', required=True)
    parser.add_argument('--description', required=True)
    args = parser.parse_args()

    if not os.path.exists(args.audio):
        print(json.dumps({"status": "failed", "error": f"Audio not found: {args.audio}"}))
        sys.exit(1)

    # Sessie opzetten
    session = requests.Session()
    cookies = parse_cookie_string(COOKIE_STRING)
    session.cookies.update(cookies)
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-GB,en;q=0.9',
        'Origin': 'https://creators.spotify.com',
        'Referer': 'https://creators.spotify.com/',
        'x-creator-client': 'Spotify Creator Studio Web',
    })

    filename = Path(args.audio).name
    print(f"Starting API upload: {filename}", file=sys.stderr)

    # Stap 1: Haal signed URL op
    signed_data = get_signed_url(session, filename)
    if not signed_data:
        print(json.dumps({"status": "failed", "error": "Could not get signed upload URL - session may be expired"}))
        sys.exit(1)

    signed_url = signed_data.get('url') or signed_data.get('signedUrl') or signed_data.get('uploadUrl')
    upload_key = signed_data.get('key') or signed_data.get('uploadKey') or signed_data.get('filename')
    
    if not signed_url:
        print(f"Unexpected response: {signed_data}", file=sys.stderr)
        print(json.dumps({"status": "failed", "error": f"No URL in response: {signed_data}"}))
        sys.exit(1)

    # Stap 2: Upload naar S3
    if not upload_to_s3(signed_url, args.audio):
        print(json.dumps({"status": "failed", "error": "S3 upload failed"}))
        sys.exit(1)

    time.sleep(2)

    # Stap 3: Maak episode aan
    result = create_episode_rest(session, args.title, args.description, upload_key)
    if not result:
        result = create_episode_graphql(session, args.title, args.description, signed_url)
    
    if not result:
        print(json.dumps({"status": "failed", "error": "Could not create/publish episode"}))
        sys.exit(1)

    episode_id = (result.get('id') or 
                  result.get('episodeId') or
                  result.get('data', {}).get('createEpisode', {}).get('episode', {}).get('id'))
    
    episode_url = f"https://creators.spotify.com/pod/show/{SHOW_ID}/episodes/{episode_id}" if episode_id else f"https://creators.spotify.com/pod/show/{SHOW_ID}/episodes"
    
    print(json.dumps({
        "status": "success",
        "episode_url": episode_url,
        "episode_id": episode_id,
        "published_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }))
    sys.exit(0)

if __name__ == "__main__":
    main()
