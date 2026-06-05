-- ─────────────────────────────────────────────────────────────────────────────
-- Ficium — Markets seed data
-- Paste this entire file into: Supabase dashboard → SQL Editor → Run
-- Safe to run multiple times (upsert on conflict).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Ticker readings
INSERT INTO public.market_data (ticker_id, value, display_value, change_pct, direction, history, source)
VALUES
  ('repo_rate',        4.00,     '4.00%',  0.00,  'flat', '{4.0,4.0,4.0,4.0,4.0,4.0,4.0}',           'bom'),
  ('usd_mur',         46.32,     '46.32', -0.28,  'down', '{46.0,46.1,46.3,46.5,46.4,46.35,46.32}',  'banks'),
  ('eur_mur',         52.18,     '52.18',  0.34,  'up',   '{51.6,51.7,51.9,52.0,52.1,52.05,52.18}',  'banks'),
  ('gbp_mur',         61.40,     '61.40',  0.21,  'up',   '{61.0,61.1,61.1,61.2,61.3,61.35,61.40}',  'banks'),
  ('semdex',        2362.45,     '2,362',  0.72,  'up',   '{2280,2295,2310,2300,2330,2345,2362}',     'sem'),
  ('avg_deposit_rate', 3.40,     '3.40%',  0.10,  'up',   '{3.2,3.25,3.3,3.3,3.35,3.38,3.40}',       'banks'),
  ('avg_lending_rate', 8.25,     '8.25%', -0.20,  'down', '{8.5,8.45,8.4,8.35,8.3,8.28,8.25}',       'banks'),
  ('inflation_yoy',    3.10,      '3.1%', -0.20,  'down', '{3.6,3.5,3.4,3.3,3.25,3.2,3.1}',          'stats')
ON CONFLICT (ticker_id) DO UPDATE SET
  value         = EXCLUDED.value,
  display_value = EXCLUDED.display_value,
  change_pct    = EXCLUDED.change_pct,
  direction     = EXCLUDED.direction,
  history       = EXCLUDED.history,
  source        = EXCLUDED.source,
  fetched_at    = now();

-- 2. FX rates (all 8 banks × 4 currencies)
INSERT INTO public.market_fx_rates (currency_code, currency_pair, bank_name, buy_rate, sell_rate)
VALUES
  ('USD','USD / MUR','MCB',      46.80, 47.10),
  ('USD','USD / MUR','SBM',      46.50, 46.85),
  ('USD','USD / MUR','Absa',     46.10, 46.60),
  ('USD','USD / MUR','AfrAsia',  46.75, 47.00),
  ('USD','USD / MUR','Bank One', 46.60, 46.95),
  ('EUR','EUR / MUR','MCB',      52.20, 52.60),
  ('EUR','EUR / MUR','SBM',      51.90, 52.30),
  ('EUR','EUR / MUR','AfrAsia',  52.40, 52.70),
  ('EUR','EUR / MUR','Absa',     52.00, 52.45),
  ('EUR','EUR / MUR','Bank One', 52.10, 52.50),
  ('GBP','GBP / MUR','MCB',      61.60, 62.10),
  ('GBP','GBP / MUR','SBM',      61.30, 61.80),
  ('GBP','GBP / MUR','Bank One', 61.90, 62.20),
  ('GBP','GBP / MUR','HSBC',     61.20, 61.70),
  ('GBP','GBP / MUR','AfrAsia',  61.75, 62.05),
  ('ZAR','ZAR / MUR','Absa',      2.55,  2.65),
  ('ZAR','ZAR / MUR','MCB',       2.50,  2.62),
  ('ZAR','ZAR / MUR','MauBank',   2.42,  2.58)
ON CONFLICT (currency_code, bank_name) DO UPDATE SET
  buy_rate   = EXCLUDED.buy_rate,
  sell_rate  = EXCLUDED.sell_rate,
  fetched_at = now();

-- 3. Deposit rates
INSERT INTO public.market_deposit_rates (bank_name, bank_color, rate_1y, rate_2y, rate_3y)
VALUES
  ('MCB',           '#1d4ed8', '3.20%', '3.35%', '3.50%'),
  ('SBM',           '#dc2626', '3.10%', '3.25%', '3.40%'),
  ('Absa',          '#ea580c', '3.00%', '3.15%', '3.30%'),
  ('SBI Mauritius', '#7c3aed', '2.95%', '3.10%', '3.25%'),
  ('AfrAsia',       '#0891b2', '2.85%', '3.00%', '3.19%')
ON CONFLICT (bank_name) DO UPDATE SET
  rate_1y    = EXCLUDED.rate_1y,
  rate_2y    = EXCLUDED.rate_2y,
  rate_3y    = EXCLUDED.rate_3y,
  fetched_at = now();

-- 4. Lending rates
INSERT INTO public.market_lending_rates (product, icon_name, best_rate, is_best)
VALUES
  ('Home Loan',      'home',      '4.95%', true),
  ('Vehicle Loan',   'car',       '5.25%', false),
  ('Personal Loan',  'user',      '6.90%', false),
  ('Business Loan',  'briefcase', '5.75%', false),
  ('Education Loan', 'book-open', '5.50%', false)
ON CONFLICT (product) DO UPDATE SET
  best_rate  = EXCLUDED.best_rate,
  is_best    = EXCLUDED.is_best,
  fetched_at = now();

-- 5. News items
INSERT INTO public.market_news (headline, category, emoji, plain_english, related_ticker_id, source)
VALUES
  ('Bank of Mauritius holds repo rate at 4.00%',          'Interest Rates', '🏦', 'Your existing loan EMIs will not change for now.',                                               'repo_rate', 'bom'),
  ('MCB Group reports record Q2 FY2025 earnings',          'Stock Market',   '📊', 'MCB Group posted its best quarterly earnings. If you hold MCB shares your balance likely grew.', 'semdex',    'sem'),
  ('USD strengthens against MUR amid global dollar rally', 'Currency',       '💱', 'The rupee weakened slightly. Imported goods may cost a little more this week.',                  'usd_mur',   'bom'),
  ('Mauritius Treasury issues new 10-year bond',           'Economy',        '📋', 'Government is borrowing at 5.2% — higher than most savings accounts.',                           null,        'bom'),
  ('Global markets trade higher after US inflation cools', 'Economy',        '🌍', 'Good news globally. Pressure on the rupee may ease if US rates start falling.',                  null,        'rss'),
  ('SEMDEX rises 0.72% — banking sector leads gains',      'Stock Market',   '📈', 'Local stocks had a good day. If you have a pension or unit trust your balance probably went up.','semdex',    'sem');

-- 6. AI-generated stories
INSERT INTO public.market_stories (story_key, category, emoji, related_cta, headline_everyday, plain_everyday, headline_finance, plain_finance)
VALUES
  (
    'home_loan_rates_2025', 'Lending', '🏠', true,
    'Thinking of a home loan? Here is what a good rate looks like',
    'A home loan rate under 5% is considered strong in Mauritius right now. Banks rarely advertise their best rate upfront. On Ficium they bid against each other so you see the real floor. The difference between 4.95% and 5.5% on a Rs 3M loan is about Rs 250,000 over 20 years.',
    'Mortgage pricing: how to read the spread',
    'Mauritian mortgages price off Repo plus margin. With Repo at 4% a 4.95% offer implies a 95bps margin. Watch the variable/fixed spread (currently ~40bps) and LTV banding: rates step up above 80% LTV.'
  ),
  (
    'savings_rates_2025', 'Savings', '🏧', true,
    'Where your savings actually grow fastest',
    'Most current accounts pay almost nothing. A 1-year fixed deposit in Mauritius pays around 3.4%. On Ficium you post how much you want to save and banks compete for your deposit.',
    'Deposit laddering vs T-bills: the real-rate view',
    'With CPI at 3.1% a 3.4% 1Y deposit yields +30bps real. The 91-day T-bill at 4.80% beats retail deposits but requires rollover discipline. A deposit ladder (3/6/12mo tranches) balances liquidity against the rate curve.'
  ),
  (
    'fuel_prices_2025', 'Economy', '⛽', false,
    'Why your petrol price changes and how to see it coming',
    'Mauritius resets fuel prices monthly based on world oil prices and the rupee. When global oil rises or the rupee weakens expect a hike at the next reset. Watching both gives you a few weeks warning.',
    'Fuel price transmission mechanism',
    'STC procures on a monthly cycle reset around the 15th. Every 1% move in oil is approximately Rs 0.15 per litre. Brent plus REER together predict the print.'
  ),
  (
    'semdex_pensions_2025', 'Stock Market', '📊', false,
    'Do you already own shares without knowing it?',
    'If you have a pension fund or unit trust in Mauritius you probably own a slice of MCB Group, SBM, Rogers and IBL. When the SEMDEX rises your retirement savings quietly grow, even if you have never bought a share yourself.',
    'SEMDEX concentration and indirect equity exposure',
    'The SEMDEX is heavily weighted toward financials and conglomerates. Most local pension mandates track it closely. Banking-sector PE at 11.2x trailing remains below regional EM peers.'
  ),
  (
    'fx_timing_2025', 'Currency', '💱', false,
    'Sending or receiving money abroad? Timing matters',
    'Exchange rates move daily and banks charge different rates on the same day. If you are paying overseas tuition or receiving a remittance check the best rate today section above before you convert.',
    'Spread arbitrage across local banks',
    'Inter-bank FX spreads in Mauritius can exceed 100bps on the same currency on the same day. For sizeable transfers comparing the buy/sell board across banks captures more than most fee waivers.'
  ),
  (
    'inflation_outlook_2025', 'Economy', '📈', true,
    'Inflation is cooling — what that means for you',
    'Prices are still rising but more slowly than last year. That is good: your money loses value less quickly. Locking a savings rate now while they are still decent can work in your favour.',
    'Disinflation trajectory and rate-cut odds',
    'Headline CPI easing to 3.1% YoY raises the probability of a dovish tilt at the next MPC. Term deposits locked now capture the current curve before any cut. Borrowers may prefer variable if cuts materialise.'
  )
ON CONFLICT (story_key) DO UPDATE SET
  headline_everyday = EXCLUDED.headline_everyday,
  plain_everyday    = EXCLUDED.plain_everyday,
  headline_finance  = EXCLUDED.headline_finance,
  plain_finance     = EXCLUDED.plain_finance,
  generated_at      = now();
