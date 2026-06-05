#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/seed-markets.sh
# Seeds all 6 market_* tables via Supabase REST API. No CLI required.
#
# Usage:
#   SUPABASE_URL=https://xxxx.supabase.co \
#   SUPABASE_SERVICE_KEY=eyJ... \
#   bash scripts/seed-markets.sh
#
# Get values from: Supabase dashboard → Project Settings → API
#   Project URL       → SUPABASE_URL
#   service_role key  → SUPABASE_SERVICE_KEY  (NOT the anon key)
# ─────────────────────────────────────────────────────────────────────────────
set -e

URL="${SUPABASE_URL:?Set SUPABASE_URL=https://xxxx.supabase.co}"
KEY="${SUPABASE_SERVICE_KEY:?Set SUPABASE_SERVICE_KEY=eyJ...}"
API="$URL/rest/v1"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

upsert() {
  local table="$1" data="$2"
  printf "  %-28s" "→ $table ..."
  code=$(curl -s -o /tmp/_sb.txt -w "%{http_code}" \
    -X POST "$API/$table" \
    -H "Authorization: Bearer $KEY" \
    -H "apikey: $KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates,return=minimal" \
    -d "$data")
  if [[ "$code" == "200" || "$code" == "201" || "$code" == "204" ]]; then
    echo "✓"
  else
    echo "✗ HTTP $code"
    cat /tmp/_sb.txt; echo
  fi
}

echo; echo "Seeding Ficium market tables → $URL"; echo

upsert "market_data" '[
  {"ticker_id":"repo_rate",        "value":4.00,    "display_value":"4.00%","change_pct":0.00, "direction":"flat","history":[4.0,4.0,4.0,4.0,4.0,4.0,4.0],          "source":"bom",  "fetched_at":"'"$NOW"'"},
  {"ticker_id":"usd_mur",          "value":46.32,   "display_value":"46.32","change_pct":-0.28,"direction":"down","history":[46.0,46.1,46.3,46.5,46.4,46.35,46.32], "source":"banks","fetched_at":"'"$NOW"'"},
  {"ticker_id":"eur_mur",          "value":52.18,   "display_value":"52.18","change_pct":0.34, "direction":"up",  "history":[51.6,51.7,51.9,52.0,52.1,52.05,52.18], "source":"banks","fetched_at":"'"$NOW"'"},
  {"ticker_id":"gbp_mur",          "value":61.40,   "display_value":"61.40","change_pct":0.21, "direction":"up",  "history":[61.0,61.1,61.1,61.2,61.3,61.35,61.40], "source":"banks","fetched_at":"'"$NOW"'"},
  {"ticker_id":"semdex",           "value":2362.45, "display_value":"2,362","change_pct":0.72, "direction":"up",  "history":[2280,2295,2310,2300,2330,2345,2362],    "source":"sem",  "fetched_at":"'"$NOW"'"},
  {"ticker_id":"avg_deposit_rate", "value":3.40,    "display_value":"3.40%","change_pct":0.10, "direction":"up",  "history":[3.2,3.25,3.3,3.3,3.35,3.38,3.40],      "source":"banks","fetched_at":"'"$NOW"'"},
  {"ticker_id":"avg_lending_rate", "value":8.25,    "display_value":"8.25%","change_pct":-0.20,"direction":"down","history":[8.5,8.45,8.4,8.35,8.3,8.28,8.25],      "source":"banks","fetched_at":"'"$NOW"'"},
  {"ticker_id":"inflation_yoy",    "value":3.10,    "display_value":"3.1%", "change_pct":-0.20,"direction":"down","history":[3.6,3.5,3.4,3.3,3.25,3.2,3.1],         "source":"stats","fetched_at":"'"$NOW"'"}
]'

upsert "market_fx_rates" '[
  {"currency_code":"USD","currency_pair":"USD / MUR","bank_name":"MCB",     "buy_rate":46.80,"sell_rate":47.10,"fetched_at":"'"$NOW"'"},
  {"currency_code":"USD","currency_pair":"USD / MUR","bank_name":"SBM",     "buy_rate":46.50,"sell_rate":46.85,"fetched_at":"'"$NOW"'"},
  {"currency_code":"USD","currency_pair":"USD / MUR","bank_name":"Absa",    "buy_rate":46.10,"sell_rate":46.60,"fetched_at":"'"$NOW"'"},
  {"currency_code":"USD","currency_pair":"USD / MUR","bank_name":"AfrAsia", "buy_rate":46.75,"sell_rate":47.00,"fetched_at":"'"$NOW"'"},
  {"currency_code":"USD","currency_pair":"USD / MUR","bank_name":"Bank One","buy_rate":46.60,"sell_rate":46.95,"fetched_at":"'"$NOW"'"},
  {"currency_code":"EUR","currency_pair":"EUR / MUR","bank_name":"MCB",     "buy_rate":52.20,"sell_rate":52.60,"fetched_at":"'"$NOW"'"},
  {"currency_code":"EUR","currency_pair":"EUR / MUR","bank_name":"SBM",     "buy_rate":51.90,"sell_rate":52.30,"fetched_at":"'"$NOW"'"},
  {"currency_code":"EUR","currency_pair":"EUR / MUR","bank_name":"AfrAsia", "buy_rate":52.40,"sell_rate":52.70,"fetched_at":"'"$NOW"'"},
  {"currency_code":"EUR","currency_pair":"EUR / MUR","bank_name":"Absa",    "buy_rate":52.00,"sell_rate":52.45,"fetched_at":"'"$NOW"'"},
  {"currency_code":"EUR","currency_pair":"EUR / MUR","bank_name":"Bank One","buy_rate":52.10,"sell_rate":52.50,"fetched_at":"'"$NOW"'"},
  {"currency_code":"GBP","currency_pair":"GBP / MUR","bank_name":"MCB",     "buy_rate":61.60,"sell_rate":62.10,"fetched_at":"'"$NOW"'"},
  {"currency_code":"GBP","currency_pair":"GBP / MUR","bank_name":"SBM",     "buy_rate":61.30,"sell_rate":61.80,"fetched_at":"'"$NOW"'"},
  {"currency_code":"GBP","currency_pair":"GBP / MUR","bank_name":"Bank One","buy_rate":61.90,"sell_rate":62.20,"fetched_at":"'"$NOW"'"},
  {"currency_code":"GBP","currency_pair":"GBP / MUR","bank_name":"HSBC",    "buy_rate":61.20,"sell_rate":61.70,"fetched_at":"'"$NOW"'"},
  {"currency_code":"GBP","currency_pair":"GBP / MUR","bank_name":"AfrAsia", "buy_rate":61.75,"sell_rate":62.05,"fetched_at":"'"$NOW"'"},
  {"currency_code":"ZAR","currency_pair":"ZAR / MUR","bank_name":"Absa",    "buy_rate":2.55, "sell_rate":2.65, "fetched_at":"'"$NOW"'"},
  {"currency_code":"ZAR","currency_pair":"ZAR / MUR","bank_name":"MCB",     "buy_rate":2.50, "sell_rate":2.62, "fetched_at":"'"$NOW"'"},
  {"currency_code":"ZAR","currency_pair":"ZAR / MUR","bank_name":"MauBank", "buy_rate":2.42, "sell_rate":2.58, "fetched_at":"'"$NOW"'"}
]'

upsert "market_deposit_rates" '[
  {"bank_name":"MCB",           "bank_color":"#1d4ed8","rate_1y":"3.20%","rate_2y":"3.35%","rate_3y":"3.50%","fetched_at":"'"$NOW"'"},
  {"bank_name":"SBM",           "bank_color":"#dc2626","rate_1y":"3.10%","rate_2y":"3.25%","rate_3y":"3.40%","fetched_at":"'"$NOW"'"},
  {"bank_name":"Absa",          "bank_color":"#ea580c","rate_1y":"3.00%","rate_2y":"3.15%","rate_3y":"3.30%","fetched_at":"'"$NOW"'"},
  {"bank_name":"SBI Mauritius", "bank_color":"#7c3aed","rate_1y":"2.95%","rate_2y":"3.10%","rate_3y":"3.25%","fetched_at":"'"$NOW"'"},
  {"bank_name":"AfrAsia",       "bank_color":"#0891b2","rate_1y":"2.85%","rate_2y":"3.00%","rate_3y":"3.19%","fetched_at":"'"$NOW"'"}
]'

upsert "market_lending_rates" '[
  {"product":"Home Loan",      "icon_name":"home",      "best_rate":"4.95%","is_best":true, "fetched_at":"'"$NOW"'"},
  {"product":"Vehicle Loan",   "icon_name":"car",       "best_rate":"5.25%","is_best":false,"fetched_at":"'"$NOW"'"},
  {"product":"Personal Loan",  "icon_name":"user",      "best_rate":"6.90%","is_best":false,"fetched_at":"'"$NOW"'"},
  {"product":"Business Loan",  "icon_name":"briefcase", "best_rate":"5.75%","is_best":false,"fetched_at":"'"$NOW"'"},
  {"product":"Education Loan", "icon_name":"book-open", "best_rate":"5.50%","is_best":false,"fetched_at":"'"$NOW"'"}
]'

upsert "market_news" '[
  {"headline":"Bank of Mauritius holds repo rate at 4.00%",         "category":"Interest Rates","emoji":"🏦","plain_english":"Your existing loan EMIs will not change for now.","published_at":"'"$NOW"'","related_ticker_id":"repo_rate","source":"bom"},
  {"headline":"MCB Group reports record Q2 FY2025 earnings",         "category":"Stock Market",  "emoji":"📊","plain_english":"MCB Group posted its best quarterly earnings. If you hold MCB shares your balance likely grew.","published_at":"'"$NOW"'","related_ticker_id":"semdex","source":"sem"},
  {"headline":"USD strengthens against MUR amid global dollar rally","category":"Currency",      "emoji":"💱","plain_english":"The rupee weakened slightly. Imported goods may cost a little more this week.","published_at":"'"$NOW"'","related_ticker_id":"usd_mur","source":"bom"},
  {"headline":"Mauritius Treasury issues new 10-year bond",          "category":"Economy",       "emoji":"📋","plain_english":"Government is borrowing at 5.2% — higher than most savings accounts.","published_at":"'"$NOW"'","source":"bom"},
  {"headline":"Global markets trade higher after US inflation cools","category":"Economy",       "emoji":"🌍","plain_english":"Good news globally. Pressure on the rupee may ease if US rates start falling.","published_at":"'"$NOW"'","source":"rss"},
  {"headline":"SEMDEX rises 0.72% — banking sector leads gains",     "category":"Stock Market",  "emoji":"📈","plain_english":"Local stocks had a good day. If you have a pension or unit trust your balance probably went up.","published_at":"'"$NOW"'","related_ticker_id":"semdex","source":"sem"}
]'

upsert "market_stories" '[
  {"story_key":"home_loan_rates_2025", "category":"Lending",       "emoji":"🏠","related_cta":true, "headline_everyday":"Thinking of a home loan? Here is what a good rate looks like","plain_everyday":"A home loan rate under 5% is considered strong in Mauritius right now. Banks rarely advertise their best rate upfront. On Ficium they bid against each other so you see the real floor.","headline_finance":"Mortgage pricing: how to read the spread","plain_finance":"Mauritian mortgages price off Repo plus margin. With Repo at 4% a 4.95% offer implies a 95bps margin. Watch the variable/fixed spread and LTV banding.","generated_at":"'"$NOW"'"},
  {"story_key":"savings_rates_2025",   "category":"Savings",       "emoji":"🏧","related_cta":true, "headline_everyday":"Where your savings actually grow fastest","plain_everyday":"Most current accounts pay almost nothing. A 1-year fixed deposit pays around 3.4%. On Ficium you post how much you want to save and banks compete for your deposit.","headline_finance":"Deposit laddering vs T-bills: the real-rate view","plain_finance":"With CPI at 3.1% a 3.4% 1Y deposit yields +30bps real. The 91-day T-bill at 4.80% beats retail deposits but requires rollover discipline.","generated_at":"'"$NOW"'"},
  {"story_key":"fuel_prices_2025",     "category":"Economy",       "emoji":"⛽","related_cta":false,"headline_everyday":"Why your petrol price changes and how to see it coming","plain_everyday":"Mauritius resets fuel prices monthly based on world oil prices and the rupee. When global oil rises or the rupee weakens expect a hike at the next reset.","headline_finance":"Fuel price transmission mechanism","plain_finance":"STC procures on a monthly cycle reset around the 15th. Every 1% move in oil is approximately Rs 0.15 per litre. Brent plus REER together predict the print.","generated_at":"'"$NOW"'"},
  {"story_key":"semdex_pensions_2025", "category":"Stock Market",  "emoji":"📊","related_cta":false,"headline_everyday":"Do you already own shares without knowing it?","plain_everyday":"If you have a pension fund or unit trust in Mauritius you probably own a slice of MCB Group, SBM, Rogers and IBL. When the SEMDEX rises your retirement savings quietly grow.","headline_finance":"SEMDEX concentration and indirect equity exposure","plain_finance":"The SEMDEX is heavily weighted toward financials and conglomerates. Most local pension mandates track it closely. Banking-sector PE at 11.2x trailing remains below regional EM peers.","generated_at":"'"$NOW"'"},
  {"story_key":"fx_timing_2025",       "category":"Currency",      "emoji":"💱","related_cta":false,"headline_everyday":"Sending or receiving money abroad? Timing matters","plain_everyday":"Exchange rates move daily and banks charge different rates on the same day. Check the best rate today section above before you convert.","headline_finance":"Spread arbitrage across local banks","plain_finance":"Inter-bank FX spreads in Mauritius can exceed 100bps on the same currency on the same day. The REER trend signals the medium-term direction.","generated_at":"'"$NOW"'"},
  {"story_key":"inflation_outlook_2025","category":"Economy",      "emoji":"📈","related_cta":true, "headline_everyday":"Inflation is cooling — what that means for you","plain_everyday":"Prices are still rising but more slowly than last year. Locking a savings rate now while they are still decent can work in your favour.","headline_finance":"Disinflation trajectory and rate-cut odds","plain_finance":"Headline CPI easing to 3.1% YoY raises the probability of a dovish tilt at the next MPC. Term deposits locked now capture the current curve before any cut.","generated_at":"'"$NOW"'"}
]'

echo; echo "Done. Visit ficium.vercel.app/markets to verify."
