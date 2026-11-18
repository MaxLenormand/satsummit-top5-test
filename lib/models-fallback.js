/* generated from crowd/models.json by crowd/lib/build_fallback.mjs; do not edit by hand */
window.CROWD_MODELS_FALLBACK = {
 "snapshot": "State of SatML leaderboard site data 2026-11-16 (geo-eval-harness 83ca5cb); deck file tg-talk-3d/data/actD_leaderboard.js (satml/leaderboard.csv), as on slide 'Our leaderboard top 10' (repo main 5ee5899)",
 "rank_basis": "real_rank = position on the deck's top-10 slide: leaderboard order (mean of KNN-5 rank and linear-probe rank, not win rate), baselines dropped, best model per family only. raw_rank = row in leaderboard.csv among all 128 ranked rows (baselines and same-family models included). win_rate in % (deck rounds to integers). ci = 95% range of the win rate, the deck's own estimate (tg-talk-3d/data/actD_ranges.js: harness score CIs redrawn 2000x, bias-corrected), not published by the leaderboard.",
 "models": [
  {
   "id": "deo",
   "name": "DEO",
   "model": "DEO Swin-B (RGB)",
   "family": "DEO",
   "kind": "satellite",
   "real_rank": 1,
   "raw_rank": 1,
   "win_rate": 86.8,
   "ci": [
    84.6,
    89
   ],
   "in_top5": true
  },
  {
   "id": "dofa",
   "name": "DOFA",
   "model": "DOFA Large",
   "family": "DOFA",
   "kind": "satellite",
   "real_rank": 2,
   "raw_rank": 2,
   "win_rate": 86.4,
   "ci": [
    84,
    88.6
   ],
   "in_top5": true
  },
  {
   "id": "dinov3-sat",
   "name": "DINOv3-SAT",
   "model": "DINOv3-SAT ViT-L/16",
   "family": "DINOv3-SAT",
   "kind": "satellite",
   "real_rank": 3,
   "raw_rank": 3,
   "win_rate": 81.4,
   "ci": [
    78.6,
    84.1
   ],
   "in_top5": true
  },
  {
   "id": "panopticon",
   "name": "Panopticon",
   "model": "Panopticon",
   "family": "Panopticon",
   "kind": "satellite",
   "real_rank": 4,
   "raw_rank": 4,
   "win_rate": 82.7,
   "ci": [
    79.9,
    85.2
   ],
   "in_top5": true
  },
  {
   "id": "clay",
   "name": "Clay",
   "model": "Clay v1.5 Large",
   "family": "Clay",
   "kind": "satellite",
   "real_rank": 5,
   "raw_rank": 5,
   "win_rate": 81.8,
   "ci": [
    79.5,
    83.8
   ],
   "in_top5": true
  },
  {
   "id": "dinov3",
   "name": "DINOv3",
   "model": "DINOv3 ViT-L/16",
   "family": "DINOv3",
   "kind": "general",
   "real_rank": 6,
   "raw_rank": 6,
   "win_rate": 80.1,
   "ci": [
    77.2,
    82.8
   ],
   "in_top5": false
  },
  {
   "id": "olmoearth",
   "name": "OlmoEarth",
   "model": "OlmoEarth v1.3 Base",
   "family": "OlmoEarth",
   "kind": "satellite",
   "real_rank": 10,
   "raw_rank": 12,
   "win_rate": 68.9,
   "ci": [
    66.4,
    71.3
   ],
   "in_top5": false
  },
  {
   "id": "scale-mae",
   "name": "Scale-MAE",
   "model": "Scale-MAE Large",
   "family": "Scale-MAE",
   "kind": "satellite",
   "real_rank": 13,
   "raw_rank": 22,
   "win_rate": 64.9,
   "ci": [
    61.8,
    68.1
   ],
   "in_top5": false
  },
  {
   "id": "prithvi",
   "name": "Prithvi-EO",
   "model": "Prithvi-EO v2 600M",
   "family": "Prithvi-EO",
   "kind": "satellite",
   "real_rank": 15,
   "raw_rank": 27,
   "win_rate": 63.7,
   "ci": [
    60.7,
    66.6
   ],
   "in_top5": false
  },
  {
   "id": "satlas",
   "name": "SatlasNet",
   "model": "SatlasNet SwinV2-B (NAIP, multi-image)",
   "family": "SatlasNet",
   "kind": "satellite",
   "real_rank": 26,
   "raw_rank": 69,
   "win_rate": 49.1,
   "ci": [
    45.7,
    52.5
   ],
   "in_top5": false
  }
 ]
};
