/**
 * Adds the `hasSalaryData` / `hasDemandData` flags to a lean career object.
 *
 * These exist as a Mongoose virtual too, but virtuals do not survive
 * `.lean()` without an extra plugin, and every read path here is lean for
 * performance. Rather than add a dependency, the rule lives in one function
 * that every lean read passes through — so "do we actually hold this figure?"
 * is answered in exactly one place.
 */
export function decorateCareer(career) {
  if (!career) return career;
  const salary = career.salary || {};
  return {
    ...career,
    hasSalaryData: salary.entry != null || salary.mid != null || salary.senior != null,
    hasDemandData: Boolean(career.demand?.level),
  };
}

export const decorateCareers = (list) => (list || []).map(decorateCareer);
