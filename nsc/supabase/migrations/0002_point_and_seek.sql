-- ============================================================
-- NSC (Number Path) — Point and Seek instrument (amendment A5)
-- ⚠ DDL GATE: PROPOSED ONLY. Do not apply without Matthew's
-- explicit go. Apply BEFORE merging the point-and-seek branch:
-- the app inserts these columns on new assessments.
-- ============================================================

-- Which instrument produced this assessment. Existing rows are Give-N.
alter table nsc_assessments
  add column instrument text not null default 'give_n'
    check (instrument in ('give_n', 'point_and_seek'));

-- Point and Seek soft signal (never a rung placement). Null for Give-N rows.
-- 'clear'   = ≥7 of 8 answered correct (above chance at p ≈ .035)
-- 'some'    = 5–6 of ≥6 answered correct (not statistically above chance;
--             copy says "some early signs", never a claim)
-- 'unclear' = everything else, including skip-heavy sessions
alter table nsc_assessments
  add column ps_signal text
    check (ps_signal in ('clear', 'some', 'unclear'));

-- No RLS changes: the new columns live on nsc_assessments, whose existing
-- owner_id policies already scope every read/write to auth.uid().
