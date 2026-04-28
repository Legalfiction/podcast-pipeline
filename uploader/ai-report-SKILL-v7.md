---
name: ai-report
description: "Dagelijkse volledig autonome pipeline die nieuwe AI Report nieuwsbrieven omzet naar een Nederlandstalige podcast van 30-40 min via NotebookLM en autonoom publiceert op Spotify for Creators via de bewezen Computer-tool methode (identiek aan dwarkesh-distributie). Geen Pi, geen Puppeteer, geen cookies. Trigger bij: 'AI Report pipeline starten', 'nieuwsbrief naar podcast', 'AI Report podcast genereren', of op de dagelijkse schedule 08:05."
---

# SKILL: AI Report — Nieuwsbrief naar Podcast Pipeline (v7.0)

## KERNPRINCIPE

Deze pipeline gebruikt exact dezelfde upload-methode als de **dwarkesh-distributie skill** die al bewezen werkt:

- Niels genereert audio in NotebookLM en downloadt naar `C:\Users\RDPgebruiker\Downloads\`
- Sven opent Spotify Creator, klikt "New episode", en gebruikt de **Computer-tool** om het Windows-bestandsdialoog te bedienen
- Geen Pi-upload, geen Puppeteer, geen cookies, geen browser-automation

**Dit is de enige methode die werkt. Afwijkingen zijn niet toegestaan.**

---

## DATA EN CONFIGURATIE

| Parameter | Waarde |
|-----------|--------|
| Nieuwsbrief bron | `https://www.aireport.nl/archive` |
| Pi-check (Drive) | File ID: `1a7PSDJuDhuq3tQ6Wdj5-68qkiJ6vgvcl` |
| State bestand | `state.json` |
| NotebookLM | `https://notebooklm.google.com` |
| NotebookLM account | `aldo.huizinga@gmail.com` |
| Taal NotebookLM | **English** (Lang-optie vereist dit) |
| Lengte | **Lang** |
| Indeling | **Gedetailleerde informatie (Deep Dive)** |
| Download-map Windows | `C:\Users\RDPgebruiker\Downloads\` |
| Naamconventie | `YYYY-MM-DD-ai-report.m4a` |
| Drive doelmap ID | `1Z1SpNkptYN3c6eLipbLdvBdlTXnR3ykk` |
| Spotify account | `aldo.huizinga@gmail.com` |
| Upload-timeout Spotify | 3 min |

---

## PIPELINE OVERZICHT

```
Stap 0: Pi-check lezen (Alex)
Stap 1: Initialisatie + doel definiëren (Alex)
Stap 2: Archief scannen (Gina)
Stap 3: Audio genereren in NotebookLM (Niels)
         → .m4a downloaden naar C:\Users\RDPgebruiker\Downloads\
Stap 4: Drive upload via Drive MCP (Sven)
Stap 5: Spotify publicatie via Computer-tool (Sven)
         → Bestandsdialoog bedienen met Computer-tool
         → Metadata invullen
         → Publiceren
Stap 6: State bijwerken (Alex)
```

---

## STAP 0 — Pi-check (Alex)

1. Lees `aireport_check.json` via `download_file_content` (file ID: `1a7PSDJuDhuq3tQ6Wdj5-68qkiJ6vgvcl`).
2. Verifieer `check_date` = vandaag, `archive_reachable` = true.

---

## STAP 1 — Initialisatie (Alex)

1. Lees `state.json`. Noteer `last_processed_date`.
2. Verifieer Windows-sessie: `navigator.userAgent.includes("Windows")` = true.
3. Schrijf doel expliciet uit: welke edities, wat eindresultaat.

---

## STAP 2 — Data Acquisitie (Gina)

1. Chrome → `https://www.aireport.nl/archive`
2. Lijst edities nieuwer dan `last_processed_date`, chronologisch oudste eerst.
3. Geen nieuwe editie → `{"status": "geen_update"}` → STOP.
4. Per editie: titel, datum, URL.

---

## STAP 3 — Audio Synthese (Niels)

Zie **AGENT: Niels** hieronder. Eindigt met `.m4a` in `C:\Users\RDPgebruiker\Downloads\` hernoemd naar `YYYY-MM-DD-ai-report.m4a`.

---

## STAP 4 — Drive Upload (Sven)

### S4.1 — Via Drive MCP (primair)

Gebruik Drive MCP `create_file` met base64-encoded bestand. Als dit faalt (sandbox bereikt Windows-pad niet) → S4.2.

### S4.2 — Handmatig via Chrome (fallback)

1. Open `https://drive.google.com/drive/folders/1Z1SpNkptYN3c6eLipbLdvBdlTXnR3ykk` in Chrome.
2. "Nieuw" → "Bestand uploaden".
3. Computer-tool: typ pad `C:\Users\RDPgebruiker\Downloads\YYYY-MM-DD-ai-report.m4a` in adresbalk dialoog.
4. Wacht op "Upload voltooid".

### S4.3 — Verificatie

Drive MCP `search_files`: `parentId = '1Z1SpNkptYN3c6eLipbLdvBdlTXnR3ykk' and title = 'YYYY-MM-DD-ai-report.m4a'`

Exact 1 resultaat, `fileSize > 1.000.000`. Noteer `fileId`.

---

## STAP 5 — Spotify Publicatie (Sven)

**Dit is de bewezen methode van dwarkesh-distributie. Volg PRECIES.**

### S5.1 — Open Spotify for Creators

1. Nieuwe Chrome-tab op Windows.
2. Naar `https://creators.spotify.com`.
3. Niet ingelogd? Log in met `aldo.huizinga@gmail.com` via Google SSO.
4. Verifieer: dashboard "Aldo's Podcast" zichtbaar, "New episode" knop aanwezig.

### S5.2 — Nieuwe aflevering starten

Klik "New episode" / "Nieuwe aflevering". Upload-scherm opent met dropzone.

### S5.3 — Bestand uploaden via Computer-tool (KRITIEK)

Het dropzone-klik opent een Windows-bestandsdialoog. **Claude in Chrome kan deze dialoog NIET direct bedienen — gebruik altijd de Computer-tool.**

Protocol:
1. Klik "Select a file" / "Kies bestand" in de dropzone.
2. Windows-bestandsdialoog verschijnt.
3. **Computer-tool:**
   - Focus adresbalk bovenin dialoog (Ctrl+L).
   - Typ volledig pad: `C:\Users\RDPgebruiker\Downloads\YYYY-MM-DD-ai-report.m4a`
   - Druk Enter.
4. Als dit niet werkt:
   - Navigeer handmatig: dubbelklik `Downloads` → klik bestand → Enter.
5. Upload-voortgangsbalk verschijnt.
6. Wacht tot 100%. Typisch 1-3 min voor 18 MB.
7. Max 3 min zonder voortgang → F5 refresh, herstart S5.2. Max 2 retries.

### S5.4 — Metadata invullen

Na upload verschijnt formulier:

| Veld | Waarde |
|------|--------|
| Titel | `AI Report — [NL titel van nieuwsbrief] ([YYYY-MM-DD])` |
| Beschrijving | `AI Report nieuwsbrief van [datum] in podcast-vorm, in het Nederlands besproken. Origineel: [artikel-URL]` |
| Afleveringstype | Full |
| Expliciete taal? | Nee |
| Illustratie | leeg (show-default) |

### S5.5 — Publiceren

1. Kies "Nu publiceren".
2. Klik "Volgende" → controleer preview → klik "Publiceren".
3. Bevestiging: "Aflevering gepubliceerd" of vergelijkbaar.

### S5.6 — Verificatie

1. Show-dashboard: nieuwe aflevering bovenaan met status "Gepubliceerd".
2. Noteer episode-URL.
3. Status "Concept" of fout → S5.5 opnieuw. Max 2 retries.

---

## STAP 6 — Afronding (Alex)

1. `state.json` bijwerken: `last_processed_date`, `last_spotify_url`, `last_drive_file_id`.
2. Lessons learned bijwerken.

---

## AGENT: NIELS — Audio Synthese

### N1. Windows-sessie check
`navigator.userAgent.includes("Windows") === true`. Zo niet → STOP.

### N2. Opruim-check
`notebooklm.google.com` → scan op "Untitled notebook" van vandaag met 0 bronnen → verwijderen.

### N3. Nieuw notebook aanmaken
Klik "+ Nieuw notebook".

### N4. Bron toevoegen via Websites
1. Kies **"Websites"** (NIET "Gekopieerde tekst").
2. Plak artikel-URL. Klik "Invoegen".
3. Wacht groen vinkje. Verifieer Nederlandse titel zichtbaar.

### N5. Notebook hernoemen
`AI Report [YYYY-MM-DD] — [eerste 6 NL-woorden van titel]`

### N6. Aanpassen-dialoog openen
Altijd via **">" chevron** (Aanpassen). NOOIT direct op "Audio-overzicht" klikken.

### N7. Instellingen

| Veld | Waarde |
|------|--------|
| Indeling | Gedetailleerde informatie |
| Taal | **English** |
| Lengte | **Lang** |
| Custom prompt | zie hieronder |

```
CRITICAL LANGUAGE REQUIREMENT: The hosts must speak ONLY in Dutch (Nederlands).
Every single word must be in Dutch. Do NOT use English at all.

This is based on a Dutch-language AI newsletter called "AI Report".
Discuss the key topics in a podcast style.
Length: 30-40 minutes total.

Remember: Dutch only. Nederlands alleen.
```

### N8. Screenshot vóór Genereren
Verifieer alle instellingen → dan klik Genereren.

### N9. Wachten
T+3, T+6, T+10, T+15 checks. T+15 = STOP. Max 1 refresh + 1 herstart.

### N10. Taal-QA
Audio afspelen. NL-woorden ("welkom", "vandaag") → ✅. EN-woorden → ❌ → verwijderen + regenereren. Max 2 regeneraties.

### N11. Download + hernoemen

1. Noteer bestaande .m4a's in Downloads.
2. NotebookLM: drie puntjes → Downloaden.
3. Verifieer nieuw bestand in Downloads via PowerShell:
   ```powershell
   Get-ChildItem "C:\Users\RDPgebruiker\Downloads\*.m4a" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
   ```
4. Hernoem naar `YYYY-MM-DD-ai-report.m4a`:
   ```powershell
   Rename-Item "C:\Users\RDPgebruiker\Downloads\[origineel].m4a" "YYYY-MM-DD-ai-report.m4a"
   ```
5. Verifieer: `Test-Path` = True, `Length` > 1.000.000.

Output naar Alex:
```json
{
  "status": "audio_klaar",
  "bestandspad": "C:\\Users\\RDPgebruiker\\Downloads\\YYYY-MM-DD-ai-report.m4a",
  "filesize_mb": N,
  "taal_qa": "nederlands"
}
```

---

## BEKENDE VALKUILEN

| # | Fout | Remedie |
|---|------|---------|
| 1 | Claude in Chrome probeert OS-dialoog direct te bedienen | Altijd Computer-tool voor Windows-dialoog |
| 2 | Bestand op G-schijf in plaats van lokale Downloads | Alleen `C:\Users\RDPgebruiker\Downloads\` accepteren |
| 3 | Engelse podcast niet opgemerkt | Audio letterlijk afspelen |
| 4 | Spotify upload hangt >3 min | F5 refresh, herstart S5.2. Max 2 retries |
| 5 | "Untitled notebook" rommel | Opruim-check N2 voor elk nieuw notebook |
| 6 | T+15 min generatie-timeout genegeerd | T+15 = harde STOP |
| 7 | NotebookLM taal=NL instellen | Altijd English + custom prompt |
| 8 | Bron via "Gekopieerde tekst" | Altijd "Websites" methode |

---

## FOUTAFHANDELING

| Fout | Actie |
|------|-------|
| Windows-sessie niet Chrome | Direct STOP |
| aireport.nl niet bereikbaar | 2 retries, dan STOP |
| NotebookLM timeout >15 min | 1× refresh, 1× herstart, dan STOP |
| Audio = Engels | Verwijder+regenereer, max 2×, dan STOP |
| Spotify upload hangt | 2 retries + refresh, dan STOP |
| Spotify "Published" niet zichtbaar | Retry 1×, dan meld eigenaar |

---

## VERSIEGESCHIEDENIS

| Versie | Datum | Wijziging |
|--------|-------|-----------|
| v1.0–v6.0 | 2026-03 → 2026-04-27 | Iteraties met Pi + Puppeteer + API. Allemaal gefaald door Pi-performance, cookie-verloop, browser-bugs. |
| **v7.0** | **2026-04-28** | **Terug naar bewezen Windows-methode. Identiek aan dwarkesh-distributie v1.0. Computer-tool voor OS-dialoog. Geen Pi-upload, geen Puppeteer, geen cookies.** |
