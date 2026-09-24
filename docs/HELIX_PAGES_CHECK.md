# GitHub Pages Rename Verification

Before and after repository rename, verify:
- workflow uses repository-relative checkout/build paths;
- deployed asset URLs are not hard-coded to `/xau-desk-daily/` unless deliberately generated from repository context;
- navigation/assets load from the renamed Pages location;
- public snapshot/data paths continue to resolve;
- no consumer relies on an old raw GitHub URL without a redirect/migration plan.
