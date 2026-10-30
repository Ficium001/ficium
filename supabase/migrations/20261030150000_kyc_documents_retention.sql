-- KYC evidence must be retained (FIAMLA: customer due-diligence records are kept for
-- at least 7 years after the relationship ends). Borrowers could delete their own KYC
-- files from storage; they no longer can. Nothing in the app deletes them; erasure,
-- when lawful, is an operator task done under the retention policy, not a user action.
DROP POLICY IF EXISTS "Users delete own KYC docs" ON storage.objects;
