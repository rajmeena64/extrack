# Fail-Fast & Zero-Fallback Policy

## 1. Absolute Rule: Fail Fast & Crash on Unexpected Result
- The core philosophy of this application is **strict fail-fast execution**.
- Agar koi bhi expected data, result, record, status ya format na mile, toh system ko **seedha crash / exception throw karna hai aur fail hona hai**.
- Silently error suppress karna, tolerate karna ya ad-hoc fallback assume karna STRICTLY PROHIBITED hai.

## 2. Zero Fallbacks Policy
- **No Property/Field Permutations**: `trade.trade_id || trade.id || trade.unique_id` jaise guessing fallbacks strictly forbidden hain. Sirf single authoritative canonical key use karni hai.
- **No Query Fallbacks**: Database queries mein alternate ID matches (jaise `WHERE unique_id = $1 OR id::text = $1`) strictly forbidden hain. Query sirf single canonical key se match hogi.
- **No Default Value Assumptions**: Missing parameters ya values par arbitrary ad-hoc defaults (jaise `|| 'long'`, `|| 'USD'`) invent nahi karna hai. Expected field missing ho toh validation failure / explicit error trigger ho.

## 3. Strict Error Throwing
- **Backend**: Contract ya payload invalid hone par ya entity na milne par seedha standard `AppError` throw kare.
- **Frontend**: Unexpected API response ya missing critical entity par silent fallback render karne ke bajaye explicit error state throw kare.
